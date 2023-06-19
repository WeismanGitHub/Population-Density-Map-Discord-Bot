import { errorEmbed } from './utils/embeds';
import { readdirSync, statSync } from 'fs';
import { CustomError } from './errors';
import iso3166 from 'iso-3166-2'
import config from './config';
import { join } from 'path';
import {
    Client,
    Collection,
    ClientOptions,
    ActivityType,
    Presence,
    Events
} from 'discord.js';

function getPaths(dir: string): string[] {
    const paths = readdirSync(dir)
    const filePaths: string[] = []

    function recursiveLoop(paths: string[]) {
        for (let path of paths) {
            const fileStat = statSync(path)
            
            if (fileStat.isFile()) {
                filePaths.push(path)
            } else if (fileStat.isDirectory()) {
                recursiveLoop(readdirSync(path).map(subPath => join(path, subPath)))
            }
        }
    }
    
    recursiveLoop(paths.map(path => join(dir, path)))
    
    return filePaths
}

function getOrderedCountries() {
    return Object.entries(iso3166.data).map(data => {
        const sortedSub = Object.entries(data[1].sub).map(sub => {
            return { code: sub[0], ...sub[1] }
        }).sort((a, b) => a.name.localeCompare(b.name))
        

        return { name: data[1].name, sub: sortedSub, code: data[0] }
    }).sort((a, b) => a.name.localeCompare(b.name))
}

type Countries = ReturnType<typeof getOrderedCountries>

export class CustomClient extends Client {
    declare public countries: Countries

    constructor(clientOptions: ClientOptions) {
        super(clientOptions);

        this.token = config.discordToken
        this.commands = new Collection()
        this.countries = getOrderedCountries()
        
        this.login(this.token)
        .then(async () => {
            this.loadEventListeners()
            this.loadCommands()
        })
    }

    // implement binary search instead of using countries.find() or like make it more efficient idk. hash map?
    // Might not be worth it tho since its only like 250 countries in total.
    public getCountry(code: string) {
        return this.countries.find(country => country.code === code) || null
    }

    private async loadCommands() {
        const commandsPaths: string[] = getPaths(join(__dirname, 'commands')).filter(file => file.endsWith('.js'))
        const commands = [];

        for (const path of commandsPaths) {
            const command = require(path);
    
            if (!command.default.data) {
                console.log(`malformed command file...`)
                continue
            }
    
            commands.push(command.default.data.toJSON());
            this.commands.set(command.default.data.name, command.default);
        }

        console.log(`loaded ${commands.length} commands...`)

        this.on(Events.InteractionCreate, async interaction => {
            if (!interaction.isCommand()) return;
        
            const command = this.commands.get(interaction.commandName);
        
            if (!command) return;

            command.execute(interaction)
            .catch((err: Error) => {
                console.error(err.message)

                const embed = err instanceof CustomError ? errorEmbed(err.message, err.statusCode) : errorEmbed()
                
                if (interaction.replied || interaction.deferred) {
                    interaction.followUp({ embeds: [embed], ephemeral: true });
                } else {
                    interaction.reply({ embeds: [embed], ephemeral: true });
                }
            })
        });
    }

    private async loadEventListeners() {
        const eventsPaths = getPaths(join(__dirname, 'events')).filter(file => file.endsWith('.js'))

        for (const eventPath of eventsPaths) {
            const event = require(eventPath);

            if (event.default.once) {
                this.once(event.default.name, (...args) => event.default.execute(...args))
            } else {
                this.on(event.default.name, (...args) => {
                    event.default.execute(...args)
                    .catch((err: Error) => {
                        console.error(err.message)

                        if (event.default.name !== Events.InteractionCreate) return

                        const embed = err instanceof CustomError ? errorEmbed(err.message, err.statusCode) : errorEmbed()
                        const interaction = args[0]
                        
                        if (interaction.replied || interaction.deferred) {
                            interaction.followUp({ embeds: [embed], ephemeral: true });
                        } else {
                            interaction.reply({ embeds: [embed], ephemeral: true });
                        }
                    })
                });
            }
        }

        console.log(`loaded ${eventsPaths.length} event listeners...`);
    }

    public setPresence(
        type: Exclude<ActivityType, ActivityType.Custom>,
        name: string,
        url?: string
    ): Presence | undefined {
        return this.user?.setPresence({
            activities: [{
                type,
                name,
                url,
            },],
        });
    }

    commands: Collection<unknown, any>;
    token: string;
}