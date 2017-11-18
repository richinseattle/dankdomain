/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  PARTY authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import {sprintf} from 'sprintf-js'
import titleCase = require('title-case')

import $ = require('../common')
import xvt = require('xvt')
import Battle = require('../battle')

module Party
{
    const le = [ xvt.Empty[$.player.emulation], '>', '<', '(' ,')', '+', '*', ']' ]
    const re = [ xvt.Empty[$.player.emulation], '<', '>', ')', '(', '+', '*', '[' ]
    const tb = [ xvt.Empty[$.player.emulation], '-', '=', '~', ':', '+', '*', 'X' ]
    const mp = [ 'M:M', ' @ ', '{#}', '($)', '[&]', '<^>', '_V_', '-X-' ]

    let g: gang = {
        name:'', members:[], handles:[], status:[], validated:[]
            , win:0, loss:0, banner:0, trim:0, back:0, fore:0
    }
    let o: gang = {
        name:'', members:[], handles:[], status:[], validated:[]
            , win:0, loss:0, banner:0, trim:0, back:0, fore:0
    }
    let posse: active[]
    let nme: active[]

    let party: choices = {
        'L': { description:'List all gangs' },
        'M': { description:'Most Wanted list' },
        'J': { description:'Join a gang' },
        'F': { description:'Fight another gang' },
        'S': { description:'Start a new gang' },
        'E': { description:'Edit your gang' },
        'R': { description:'Resign your membership' },
        'T': { description:'Transfer leadership' }
	}

export function menu(suppress = true) {
    if ($.checkXP($.online, menu)) return
    if ($.online.altered) $.saveUser($.player)
    if (!$.reason && $.online.hp < 1) $.reason = 'fought bravely?'
    if ($.reason) xvt.hangup()

    $.action('party')
    xvt.app.form = {
        'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
    }
    xvt.app.form['menu'].prompt = $.display('party', xvt.Magenta, xvt.magenta, suppress, party)
    xvt.app.focus = 'menu'
}

function choice() {
    let suppress = $.player.expert
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(party[choice]))
        if (xvt.validator.isNotEmpty(party[choice].description)) {
            xvt.out(' - ', party[choice].description, '\n')
            suppress = true
        }
    else {
        xvt.beep()
        suppress = false
    }

    let rs: any[]

    switch (choice) {
        case 'L':
            rs = $.query(`SELECT * FROM Gangs`)
            for (let i = 0; i < rs.length; i += 2) {
                if (i + 1 < rs.length)
                    showGang(loadGang(rs[i]), loadGang(rs[i + 1]))
                else
                    showGang(loadGang(rs[i]))
            }

            xvt.app.form = {
                'pause': { cb:menu, pause:true }
            }
            xvt.app.focus = 'pause'
            return

        case 'M':
            xvt.out(xvt.Blue, xvt.bright, '\n')
            xvt.out('        Party            Win-Loss   Ratio \n')
            xvt.out('------------------------------------------\n', xvt.reset)
            rs = $.query(`SELECT * FROM Gangs ORDER BY win DESC, loss ASC`)
            for (let i in rs) {
                let ratio = rs[i].loss ? sprintf('%5.3f', rs[i].win / (rs[i].win + rs[i].loss)).substr(1) : 'undefeated'
                xvt.out(sprintf('%-22s %5u-%-5u ', rs[i].name, rs[i].win, rs[i].loss), ratio, '\n')
            }

            xvt.app.form = {
                'pause': { cb:menu, pause:true }
            }
            xvt.app.focus = 'pause'
            return

        case 'S':
            if (!$.access.roleplay) break
            if ($.player.gang) break

            $.action('freetext')
            xvt.app.form = {
                'new': { cb:() => {
                    xvt.out('\n')
                    g.name = $.titlecase(xvt.entry)
                    if (g.name === 'New' || $.cuss(g.name))
                        xvt.hangup()
                    g.members = [ $.player.id ]
                    g.banner = $.dice(7)
                    g.trim = $.dice(7)
                    g.back = $.dice(7)
                    g.fore = $.dice(7)
                    showGang(g)

                    $.action('yn')
                    xvt.app.focus = 'accept'
                }, prompt:'New gang name? ', min:2, max:22 },
                'accept': { cb:() => {
                    xvt.out('\n')
                    if (/Y/i.test(xvt.entry)) {
                        $.player.gang = g.name
                        $.online.altered = true
                        saveGang(g, true)
                        menu()
                    }
                    else {
                        g.banner = $.dice(7)
                        g.trim = $.dice(7)
                        g.back = $.dice(7)
                        g.fore = $.dice(7)
                        showGang(g)
                        xvt.app.refocus()
                        return
                    }
                }, prompt:'Accept this banner (Y/N)? ', enter:'N', eol:false, match:/Y|N/i }
            }
            xvt.app.focus = 'new'
            return

        case 'R':
            if (!$.access.roleplay) break
            if (!$.player.gang) break
            if (!$.party) {
                xvt.beep()
                break
            }
            
            g = loadGang($.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0])
            showGang(g)

            $.action('yn')
            xvt.app.form = {
                'resign': { cb:() => {
                    xvt.out('\n')
                    if (/Y/i.test(xvt.entry)) {
                        $.player.gang = ''
                        $.online.altered = true
                        let i = g.members.indexOf($.player.id)
                        if (i > 0) {
                            g.members.splice(i, 1)
                            saveGang(g)
                        }
                        else {
                            xvt.out('Dissolving the gang... ')
                            $.sqlite3.exec(`UPDATE Players SET gang = '' WHERE gang = '${g.name}'`)
                            $.sqlite3.exec(`DELETE FROM Gangs WHERE name = '${g.name}'`)
                            xvt.out('ok.\n')
                        }
                    }
                    menu()
                }, prompt:'Resign (Y/N)? ', enter:'N', eol:false, match:/Y|N/i }
            }
            xvt.app.focus = 'resign'
            return

        case 'J':
            if (!$.access.roleplay) break
            if ($.player.gang) break

            g.members = []
            rs = $.query(`SELECT * FROM Gangs ORDER BY name`)
            do {
                g = loadGang(rs[0])
                rs.splice(0, 1)
                if (g.members.length < 4)
                    break
            } while (rs.length)

            if (g.members.length > 0 && g.members.length < 4) {
                showGang(g)

                $.action('yn')
                xvt.app.form = {
                    'join': { cb:() => {
                        xvt.out('\n')
                        if (/Y/i.test(xvt.entry)) {
                            $.player.gang = g.name
                            $.online.altered = true
                            if (g.members.indexOf($.player.id) < 0)
                                g.members.push($.player.id)
                            $.sqlite3.exec(`UPDATE Gangs SET members = '${g.members.join()}' WHERE name = '${g.name}'`)
                        }
                        else {
                            g.members = []
                            while (rs.length) {
                                g = loadGang(rs[0])
                                rs.splice(0, 1)
                                if (g.members.length < 4)
                                    break
                            }
                            if (g.members.length > 0 && g.members.length < 4) {
                                showGang(g)
                                xvt.app.refocus()
                                return
                            }
                        }
                        menu()
                    }, prompt:'Join (Y/N)? ', enter:'N', eol:false, match:/Y|N/i }
                }
                xvt.app.focus = 'join'
                return
            }
            break

        case 'T':
            if (!$.access.roleplay) break
            if (!$.player.gang) break

            g = loadGang($.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0])
            showGang(g)
            if (g.members.indexOf($.player.id) != 0) {
                xvt.beep()
                xvt.out('\nYou are not its leader.\n')
                break
            }

            Battle.user('Transfer leadership to', (member: active) => {
                let n = g.members.indexOf(member.user.id)
                if (n < 0) {
                    xvt.beep()
                    xvt.out(`\n${member.user.handle} is not a member.\n`)
                }
                else {
                    if (member.user.gang === g.name) {
                        g.members[0] = member.user.id
                        g.members[n] = $.player.id
                        saveGang(g)
                        showGang(g)
                        xvt.out(xvt.bright, '\n', member.user.handle, ' is now leader of ', g.name, '.\n', xvt.reset)
                    }
                    else {
                        xvt.beep()
                        xvt.out(`\n${member.user.handle} has not accepted membership.\n`)
                    }
                }
                menu()
            })
            return

        case 'E':
            if (!$.access.roleplay) break
            if (!$.player.gang) break
            if (!$.party) {
                xvt.beep()
                break
            }
            
            g = loadGang($.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0])
            showGang(g)
            if (g.members.indexOf($.player.id) != 0) {
                xvt.beep()
                xvt.out('\nYou are not its leader.\n')
                break
            }

            $.action('yn')
            xvt.app.form = {
                'drop': { cb:() => {
                    xvt.out('\n')
                    if (/Y/i.test(xvt.entry)) {
                        Battle.user('Drop', (member: active) => {
                            let n = g.members.indexOf(member.user.id)
                            if (n < 0) {
                                xvt.beep()
                                xvt.out(`\n${member.user.handle} is not a member.\n`)
                            }
                            else {
                                if (member.user.gang === g.name) {
                                    member.user.gang = ''
                                    $.saveUser(member)
                                    g.members.splice(n, 1)
                                    saveGang(g)
                                    showGang(g)
                                    xvt.out(xvt.bright, '\n', member.user.handle, ' is no longer on ', g.name, '.\n', xvt.reset)
                                }
                            }
                            menu()
                        })
                    }
                    else
                        xvt.app.focus = 'invite'
                }, prompt:'Drop a member (Y/N)? ', enter:'N', eol:false, match:/Y|N/i },
                'invite': { cb: () => {
                    xvt.out('\n')
                    if (/Y/i.test(xvt.entry)) {
                        Battle.user('Invite', (member: active) => {
                            let n = g.members.indexOf(member.user.id)
                            if (n >= 0) {
                                xvt.beep()
                                xvt.out(`\n${member.user.handle} is already a member.\n`)
                            }
                            else {
                                if (!member.user.gang) {
                                    g.members.push(member.user.id)
                                    saveGang(g)
                                    showGang(g)
                                    xvt.out(xvt.bright, '\n', member.user.handle, ' is invited to join ', g.name, '.\n', xvt.reset)
                                }
                            }
                            menu()
                        })
                    }
                    else
                        menu()
                }, prompt:'Invite another player (Y/N)? ', enter:'N', eol:false, match:/Y|N/i }
            }
            xvt.app.focus = 'drop'
            return

        case 'F':
            if (!$.access.roleplay) break
            if (!$.player.gang) break
            if (!$.party) {
                xvt.beep()
                break
            }

            g = loadGang($.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0])

            rs = $.query(`SELECT * FROM Gangs ORDER BY name`)
            for (let i = 0; i < rs.length; i ++) {
                o = loadGang(rs[i])
                if (o.name !== g.name)
                    xvt.out($.bracket(i + 1), o.name)
            }

            $.action('list')
            xvt.app.form = {
                'gang': { cb:() => {
                    xvt.out('\n')
                    let i = (+xvt.entry >>0) - 1
                    if (/m|max/i.test(xvt.entry))
                        i = rs.indexOf('Monster Mash')
                    if (!rs[i]) {
                        xvt.beep()
                        menu()
                        return
                    }

                    o = loadGang(rs[i])
                    if (o.name === g.name) {
                        xvt.app.refocus()
                        return
                    }

                    posse = new Array($.online)
                    for (let i = 0; i < g.members.length; i++) {
                        if (g.members[i] !== $.player.id) {
                            let who = $.query(`SELECT handle, status, gang FROM Players WHERE id = '${g.members[i]}'`)
                            if (who.length) {
                                if (who[0].gang === g.name) {
                                    let n = posse.push(<active>{ user:{ id:g.members[i]} }) - 1
                                    $.loadUser(posse[n])
                                    if (posse[n].user.status)
                                        posse.pop()
                                    else
                                        $.activate(posse[n])
                                }
                            }
                        }
                    }

                    let monsters: monster = require('../etc/dungeon.json')
                    nme = new Array()
                    for (let i = 0; i < o.members.length; i++) {
                        if (!/_MM.$/.test(o.members[i])) {
                            let who = $.query(`SELECT handle, status, gang FROM Players WHERE id = '${o.members[i]}'`)
                            if (who.length) {
                                if (who[0].gang === o.name) {
                                    let n = nme.push(<active>{ user:{ id:o.members[i]} }) - 1
                                    $.loadUser(nme[n])
                                    if (nme[n].user.status)
                                        nme.pop()
                                    else
                                        $.activate(nme[n])
                                }
                            }
                        }
                        else {
                            nme.push(<active>{})
                            nme[i].user = <user>{id: ''}

                            let mon = $.dice(7) - 4 + (posse[i] ? posse[i].user.level : $.dice(100))
                            mon = mon < 0 ? 0 : mon >= Object.keys(monsters).length ? Object.keys(monsters).length - 1 : mon
                            let dm = Object.keys(monsters)[mon]
                            nme[i].user.handle = dm
                            nme[i].user.sex = 'I'
                            $.reroll(nme[i].user, monsters[dm].pc ? monsters[dm].pc : $.player.pc, mon)

                            nme[i].user.weapon = monsters[dm].weapon ? monsters[dm].weapon : $.Weapon.merchant[Math.trunc(($.Weapon.merchant.length - 1) * mon / 100) + 1]
                            nme[i].user.armor = monsters[dm].armor ? monsters[dm].armor : $.Armor.merchant[Math.trunc(($.Armor.merchant.length - 1) * mon / 100) + 1]

                            nme[i].user.poisons = []
                            if (monsters[dm].poisons)
                                for (let vials in monsters[dm].poisons)
                                    $.Poison.add(nme[i].user.poisons, monsters[dm].poisons[vials])

                                    nme[i].user.spells = []
                            if (monsters[dm].spells)
                                for (let magic in monsters[dm].spells)
                                    $.Magic.add(nme[i].user.spells, monsters[dm].spells[magic])
        
                            $.activate(nme[i])
                            nme[i].user.coin = new $.coins($.money(mon))

                            nme[i].user.handle = titleCase(dm)
                            nme[i].user.gang = o.name
                            o.handles[i] = nme[i].user.handle
                            o.status[i] = ''
                            o.validated[i] = true
                        }
                    }

                    if (!nme.length) {
                        xvt.out('That gang is not active!\n')
                        menu()
                    }

                    $.action('yn')
                    showGang(g, o, true)
                    xvt.app.focus = 'fight'
                }, prompt:'\nFight which gang? ', max:3 },
                'fight': { cb:() => {
                    xvt.out('\n\n')
                    if (/Y/i.test(xvt.entry)) {
                        $.party--
                        $.music('party')

                        xvt.out(xvt.bright, xvt.magenta, nme[0].user.handle, xvt.reset
                            , ' grins as ', $.who(nme[0], 'he'), 'pulls out '
                            , $.who(nme[0], 'his'), nme[0].user.weapon, '.\n\n')
                        xvt.waste(1000)

                        Battle.engage('Party', posse, nme, menu)
                    }
                    else
                        menu()
            }, prompt:'Fight this gang (Y/N)? ', enter:'N', eol:false, match:/Y|N/i }
            }
            xvt.app.focus = 'gang'
            return

        case 'Q':
			require('./main').menu($.player.expert)
			return
	}
	menu(suppress)
}

function loadGang(rs: any): gang {
    let gang: gang = {
        name: rs.name,
        members: rs.members.split(','),
        handles: [],
        status: [],
        validated: [],
        win: rs.win,
        loss: rs.loss,
        banner: rs.banner >>4,
        trim: rs.banner % 8,
        back: rs.color >>4,
        fore: rs.color % 8
    }

    for (let n = 0; n < gang.members.length; n++) {
        let who = $.query(`SELECT handle, status, gang FROM Players WHERE id = '${gang.members[n]}'`)
        if (who.length) {
            gang.handles.push(who[0].handle)
            gang.status.push(who[0].status)
            gang.validated.push(who[0].gang ? who[0].gang === rs.name : undefined)
        }
        else if (gang.members[n][0] === '_') {
            gang.handles.push('')
            gang.status.push('')
            gang.validated.push(true)
        }
        else {
            gang.handles.push(`?unknown ${gang.members[n]}`)
            gang.status.push('?')
            gang.validated.push(false)
        }
    }

    return gang
}

function saveGang(g: gang, insert = false) {
    if (insert) {
        try {
            $.sqlite3.exec(`
                INSERT INTO Gangs (
                    name, members, win, loss, banner, color
                ) VALUES (
                    '${g.name}', '${g.members.join()}',
                    ${g.win}, ${g.loss},
                    ${(g.banner <<4) + g.trim}, ${(g.back <<4) + g.fore}
            )`)
        }
        catch(err) {
            if (err.code !== 'SQLITE_CONSTRAINT_PRIMARYKEY') {
                xvt.beep()
                xvt.out(xvt.reset, '\n?Unexpected error: ', String(err), '\n')
                xvt.waste(5000)
            }
        }
    }
    else {
        try {
            $.sqlite3.exec(`
                UPDATE Gangs
                    set members = '${g.members.join()}'
                    , win = ${g.win}, loss = ${g.loss}
                    , banner = ${(g.banner <<4) + g.trim}, color = ${(g.back <<4) + g.fore}
                WHERE name = '${g.name}'
            `)
        }
        catch(err) {
            xvt.beep()
            xvt.out(xvt.reset, '\n?Unexpected error: ', String(err), '\n')
            xvt.waste(5000)
        }
    }
}

function showGang(lg: gang, rg?: gang, engaged = false) {
    xvt.out(xvt.reset, '\n')

    //
    xvt.out(xvt.bright, xvt.white, mp[lg.banner])
    if (rg)
        xvt.out(' '.repeat(31), mp[rg.banner])
    xvt.out(xvt.reset, '\n')

    //
    xvt.out(' |', xvt.Black + lg.back, xvt.black + lg.fore, xvt.bright)
    xvt.out(le[lg.trim], tb[lg.trim].repeat(26), re[lg.trim], xvt.reset)
    if (rg) {
        xvt.out(' '.repeat(4), ' |', xvt.Black + rg.back, xvt.black + rg.fore, xvt.bright)
        xvt.out(le[rg.trim], tb[rg.trim].repeat(26), re[rg.trim])
    }
    xvt.out(xvt.reset, '\n')

    //
    xvt.out(' |', xvt.Black + lg.back, xvt.black + lg.fore, xvt.bright)
    let i = 26 - lg.name.length
    xvt.out(le[lg.trim], ' '.repeat(i >>1), lg.name, ' '.repeat((i >>1) + i % 2), re[lg.trim], xvt.reset)
    if (rg) {
        xvt.out(' '.repeat(4), ' |', xvt.Black + rg.back, xvt.black + rg.fore, xvt.bright)
        i = 26 - rg.name.length
        xvt.out(le[rg.trim], ' '.repeat(i >>1), rg.name, ' '.repeat((i >>1) + i % 2), re[rg.trim])
    }
    xvt.out(xvt.reset, '\n')
    
    //
    xvt.out(' |', xvt.Black + lg.back, xvt.black + lg.fore, xvt.bright)
    xvt.out(le[lg.trim], tb[lg.trim].repeat(26), re[lg.trim], xvt.reset)
    if (rg) {
        xvt.out(' '.repeat(4), ' |', xvt.Black + rg.back, xvt.black + rg.fore, xvt.bright)
        xvt.out(le[rg.trim], tb[rg.trim].repeat(26), re[rg.trim])
    }
    xvt.out(xvt.reset, '\n')

    //
    let n = 0
    let who: { handle:string, status:string, gang:string }[]
    while (n < 4 && ((lg && lg.members.length) || (rg && rg.members.length))) {
        if (lg) {
            xvt.out(' | ')
            if (n < lg.members.length) {
                if (lg.handles[n]) {
                    if (lg.validated[n]) {
                        if (lg.status[n]) {
                            if (engaged)
                                xvt.out(xvt.faint, xvt.red, 'x ')
                            else
                                xvt.out(xvt.faint, xvt.blue, '^ ')
                        }
                        else
                            xvt.out(xvt.bright, xvt.white, '  ')
                    }
                    else {
                        if (typeof lg.validated[n] == 'undefined') {
                            if (engaged)
                                xvt.out(xvt.faint, xvt.red, 'x ')
                            else
                                xvt.out(xvt.faint, xvt.yellow, '> ')
                        }
                        else {
                            if (engaged)
                                xvt.out(xvt.faint, xvt.red, 'x ')
                            else
                                xvt.out(xvt.faint, xvt.red, 'x ', xvt.blue)
                        }
                    }
                    xvt.out(sprintf('%-24s ', lg.handles[n]))
                }
                else
                    xvt.out(sprintf('> %-24s ', 'wired for '
                        + ['mashing','smashing','beatdown','pounding'][n]))
            }
            else {
                if (engaged)
                    xvt.out(sprintf(' '.repeat(27)))
                else
                    xvt.out(sprintf(' -open invitation to join- '))
            }
        }

        if (rg) {
            xvt.out(xvt.reset, ' '.repeat(4), ' | ')
            if (n < rg.members.length) {
                if (rg.handles[n]) {
                    if (rg.validated[n]) {
                        if (rg.status[n]) {
                            if (engaged)
                                xvt.out(xvt.faint, xvt.red, 'x ')
                            else
                                xvt.out(xvt.faint, xvt.blue, '^ ')
                        }
                        else
                            xvt.out(xvt.bright, xvt.white, '  ')
                    }
                    else {
                        if (typeof rg.validated[n] == 'undefined') {
                            if (engaged)
                                xvt.out(xvt.faint, xvt.red, 'x ')
                            else
                                xvt.out(xvt.faint, xvt.yellow, '> ')
                        }
                        else {
                            if (engaged)
                                xvt.out(xvt.faint, xvt.red, 'x ')
                            else
                                xvt.out(xvt.faint, xvt.red, 'x ', xvt.blue)
                        }
                    }
                    xvt.out(sprintf('%-24s ', rg.handles[n]))
                }
                else
                    xvt.out(sprintf('> %-24s ', 'wired for '
                        + ['mashing','smashing','beatdown','pounding'][n]))
            }
            else
                if (!engaged)
                    xvt.out(sprintf(' -open invitation to join- '))
        }
        xvt.out(xvt.reset, '\n')
        n++
    }
}

}

export = Party
