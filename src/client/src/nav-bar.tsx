import { errorToast, successToast } from './toasts'
import React from 'react'
import ky from 'ky'

export default function NavBar() {
    function logout() {
        if (!window.confirm('Are you sure you want to logout?')) {
            return
        }

        ky.post('/api/v1/auth/logout')
        .then(res => {
            successToast('Logged out!')
        })
        .catch(err => errorToast('Could not log out.'))
    }

    return (<>
        <div className='navbar'>
            <a className='navbar-button' href="/">home</a>
            <a className='navbar-button' href="/discord/oauth2">login</a>
            <div className='navbar-button' onClick={logout}>logout</div>
        </div>
    </>)
}