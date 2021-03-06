/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  ARENA authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import fs = require('fs')
import {sprintf} from 'sprintf-js'

import $ = require('../common')
import xvt = require('xvt')
import Battle = require('../battle')

module Arena
{
	let monsters: monster[] = require('../etc/arena.json')
	let arena: choices = {
		'U': { description:'User fights' },
		'M': { description:'Monster fights' },
		'J': { description:'Joust users' },
		'C': { description:'Cast a spell' },
		'P': { description:'Poison your weapon' },
		'G': { description:'Goto the square' },
		'Y': { description:'Your status' }
	}

export function menu(suppress = true) {
    if ($.checkXP($.online, menu)) return
	if ($.online.altered) $.saveUser($.online)
	if ($.reason) xvt.hangup()

	$.action('arena')
    xvt.app.form = {
        'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
    }

	let hints = ''
	if (!suppress) {
		if ($.online.hp < $.player.hp)
			hints += `> Buy Hit Points!\n`
		if ($.joust)
			hints += `> Try jousting another player to win money.\n`
		if ($.player.poisons.length && !$.online.toWC)
			hints += `> Don\'t forget to poison your weapon.\n`
		if ($.player.coin.value)
			hints += `> Carrying money around here is not a good idea.  Spend it in the Square\n  or deposit it in the Bank for safer keeping.\n`
	}
	xvt.app.form['menu'].prompt = $.display('arena', xvt.Red, xvt.red, suppress, arena, hints)
	xvt.app.focus = 'menu'
}

function choice() {
    let suppress = false
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(arena[choice]))
        if (xvt.validator.isNotEmpty(arena[choice].description)) {
            xvt.out(' - ', arena[choice].description)
            suppress = $.player.expert
        }
    xvt.out('\n')

    switch (choice) {
		case 'C':
			if (!$.access.roleplay) break
			Battle.cast($.online, menu)
			return

		case 'G':
            require('./square').menu($.player.expert)
            return

		case 'J':
			if (!$.joust) {
				xvt.out('\nYou have run out of jousts.\n')
				break
			}
			Battle.user('Joust', (opponent: active) => {
				if (opponent.user.id === '') {
					menu()
					return
				}
				if (opponent.user.id === $.player.id) {
					opponent.user.id = ''
					xvt.out('\nYou can\'t joust a wimp like', $.who(opponent, 'him'), '.\n')
					menu()
					return
				}
				if ($.player.level - opponent.user.level > 3) {
					xvt.out('\nYou can only joust someone higher or up to three levels below you.\n')
					menu(true)
					return
				}

				let ability = $.PC.jousting($.online)
				let versus = $.PC.jousting(opponent)
				let factor = (100 - ($.player.level > opponent.user.level ? $.player.level : opponent.user.level)) / 10 + 3
				let jw = 0
				let jl = 0
				let pass = 0

				if (!$.Access.name[opponent.user.access].roleplay || versus < 1 || opponent.user.level > 1 && (opponent.user.jw + 3 * opponent.user.level) < opponent.user.jl) {
					xvt.out('That knight is out practicing right now.\n')
					menu(true)
					return
				}

				xvt.out('\nJousting ability:\n\n', xvt.bright)
				xvt.out(xvt.green, sprintf('%-25s', opponent.user.handle), xvt.white, sprintf('%4d', versus), '\n')
				xvt.out(xvt.green, sprintf('%-25s', $.player.handle), xvt.white, sprintf('%4d', ability), '\n')
				xvt.out(xvt.reset, '\n')
				if ((ability + factor * $.player.level) < (versus + 1)) {
					xvt.out(opponent.user.handle, ' laughs rudely in your face!\n\n')
					menu(true)
					return
				}

				$.action('yn')
				xvt.app.form = {
					'compete': { cb:() => {
						xvt.out('\n')
						if (/Y/i.test(xvt.entry)) {
							$.online.altered = true
							if ($.joust-- > 2)
								$.music('joust')
							$.action('joust')
							$.profile({ jpg:'arena/joust'
								, handle:opponent.user.handle
								, level:opponent.user.level, pc:opponent.user.pc
								, effect:'slideInLeft'
							})
							xvt.out('\nThe trumpets blare! You and your opponent ride into the arena. The crowd roars!\n')
							round()
							xvt.app.focus = 'joust'
							return
						}
						menu()
						return
					}, prompt:'Are you sure (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:10 },
					'joust': { cb:() => {
						if (/F/i.test(xvt.entry)) {
							$.animated('pulse')
							$.sound('boo')
							xvt.out('\n\nThe crowd throws rocks at you as you ride out of the arena.\n')
							$.player.jl++
							if ($.run(`UPDATE Players set jw=jw+1 WHERE id='${opponent.user.id}'`).changes)
								$.log(opponent.user.id, `\n${$.player.handle} forfeited to you in a joust.`)
							xvt.waste(250)
							$.animated('slideOutRight')
							menu()
							return
						}
						if (/J/i.test(xvt.entry)) {
							xvt.out('\n\nYou spur the horse.  The tension mounts.\n')
							xvt.waste(250)
							let result = 0
							while(!result)
								result = (ability + $.dice(factor * $.player.level)) - (versus + $.dice(factor * opponent.user.level))
							if(result > 0) {
								$.animated(['flash', 'jello', 'rubberBand'][jw])
								$.sound('wall')
								xvt.out(xvt.green, '-*>', xvt.bright, xvt.white, ' Thud! ', xvt.normal, xvt.green,'<*-  ', xvt.reset, 'A hit!  You win this pass!\n')
								if (++jw == 3) {
									xvt.out('\nYou have won the joust!\n')
									xvt.waste(250)
									$.sound('cheer')
									xvt.out('The crowd cheers!\n')
									let reward = new $.coins($.money(opponent.user.level))
									xvt.out('You win ', reward.carry(), '!\n')
									$.player.coin.value += reward.value
									$.player.jw++
									if ($.run(`UPDATE Players set jl=jl+1 WHERE id='${opponent.user.id}'`).changes)
										$.log(opponent.user.id, `\n${$.player.handle} beat you in a joust and got ${reward.carry()}.`)
									xvt.waste(250)
									$.animated('hinge')
									menu()
									return
								}
							}
							else {
								$.animated(['bounce', 'shake', 'tada'][jl])
								$.sound('oof')
								xvt.out(xvt.magenta, '^>', xvt.bright, xvt.white, ' Oof! ', xvt.normal, xvt.magenta,'<^  ', xvt.reset
									, $.who(opponent, 'He'), 'hits!  You lose this pass!\n'
								)
								if (++jl == 3) {
									xvt.out('\nYou have lost the joust!\n')
									$.sound('boo')
									xvt.out('The crowd boos you!\n')
									xvt.waste(250)
									let reward = new $.coins($.money($.player.level))
									xvt.out(opponent.user.handle, ' spits on your face.\n')
									$.player.jl++
									if ($.run(`UPDATE Players set jw=jw+1, coin=coin+${reward.value} WHERE id='${opponent.user.id}'`).changes)
										$.log(opponent.user.id, `\n${$.player.handle} lost to you in a joust.  You got ${reward.carry()}.`)
									$.news(`\tlost to ${opponent.user.handle} in a joust`)
									$.wall(`lost to ${opponent.user.handle} in a joust`)
									xvt.waste(250)
									$.animated('slideOutRight')
									menu()
									return
								}
							}
							round()
						}
						xvt.app.refocus()
					}, prompt:xvt.attr('        ', $.bracket('J', false), xvt.bright, xvt.yellow, ' Joust', xvt.normal, xvt.magenta, ' * ', $.bracket('F', false), xvt.bright, xvt.yellow, ' Forfeit: '), cancel:'F', enter:'J', eol:false, match:/F|J/i }
				}
				xvt.out('You grab a horse and prepare yourself to joust.\n')
				xvt.app.focus = 'compete'

				function round() {
					xvt.out('\n', xvt.green, '--=:)) Round ', ['I', 'II', 'III', 'IV', 'V'][pass++], ' of V: Won:', xvt.bright, xvt.white, jw.toString(), xvt.normal, xvt.magenta, ' ^', xvt.green, ' Lost:', xvt.bright, xvt.white, jl.toString(), xvt.normal, xvt.green, ' ((:=--')
				}
			})
			return

		case 'M':
			if (!$.arena) {
				xvt.out('\nYou have no more arena fights.\n')
				break
			}
			$.action('monster')
			xvt.app.form = {
				pick: { cb: () => {
					if (xvt.entry.length) {
						let mon = $.int(xvt.entry)
						if (! /D/i.test(xvt.entry)) {
							if (mon < 1 || mon > monsters.length) {
								xvt.out(' ?? ')
								xvt.app.refocus()
								return
							}
							xvt.entry = mon.toString()
						}
						xvt.out('\n')
						if (!MonsterFights())
							menu()
					}
					else {
						xvt.out('\n')
						menu()
					}
				}
				, prompt: 'Fight what monster (' + xvt.attr(xvt.white, '1-' + monsters.length, xvt.cyan, ', ', $.bracket('D', false), xvt.cyan, 'emon)? ')
				, min:0, max:2 }
			}
			xvt.app.focus = 'pick'
			return

		case 'P':
			if (!$.access.roleplay) break
			Battle.poison($.online, menu)
			return

        case 'Q':
			require('./main').menu($.player.expert)
			return

		case 'U':
			if (!$.arena) {
				xvt.out('\nYou have no more arena fights.\n')
				break
			}
			Battle.user('Fight', (opponent: active) => {
				if (opponent.user.id === '') {
					menu()
					return
				}
				if (opponent.user.id === $.player.id) {
					opponent.user.id = ''
					xvt.out('\nYou can\'t fight a wimp like ', $.who(opponent, 'him'), '\n')
					menu()
					return
				}
				if ($.player.level - opponent.user.level > 3) {
					xvt.out('\nYou can only fight someone higher or up to three levels below you.\n')
					menu()
					return
				}

				xvt.out(opponent.user.handle, ' ')

				if (opponent.user.status.length) {
					xvt.out('was defeated by ')
					let rpc: active = { user: { id: opponent.user.status } }
					if ($.loadUser(rpc)) {
						xvt.out(rpc.user.handle, xvt.cyan, ' (', xvt.bright, xvt.white, opponent.user.xplevel.toString(), xvt.normal, xvt.cyan, ')', xvt.reset)
					}
					else {
						xvt.out(opponent.user.status)
					}
					xvt.out('.\n')
					menu()
					return
				}
				xvt.out(`is a level ${opponent.user.level} ${opponent.user.pc}`)
				if (opponent.user.level !== opponent.user.xplevel)
					xvt.out(' ', $.bracket(opponent.user.xplevel, false))
				xvt.out('\n')

				if ($.player.novice && !opponent.user.novice) {
					xvt.out('You are allowed only to fight other novices.\n')
					menu()
					return
				}

				if (!$.Access.name[opponent.user.access].roleplay || opponent.user.id[0] === '_') {
					xvt.out('You are allowed only to fight other players.\n')
					if (opponent.user.id[0] === '_') {
						if (($.online.cha = $.PC.ability($.player.cha, -10)) < 20)
							$.online.cha = 20
						$.online.altered = true
						$.player.coward = true
					}
					menu()
					return
				}

				if (!$.player.novice && opponent.user.novice) {
					xvt.out('You are not allowed to fight novices.\n')
					menu()
					return
				}

				if (!$.lock(opponent.user.id)) {
					$.beep()
					xvt.out(`${$.who(opponent, 'He')}is currently engaged elsewhere and not available.\n`)
					menu()
					return
				}

				if (isNaN(+opponent.user.weapon)) xvt.out('\n', $.who(opponent, 'He'), $.Weapon.wearing(opponent), '.\n')
				if (isNaN(+opponent.user.armor)) xvt.out('\n', $.who(opponent, 'He'), $.Armor.wearing(opponent), '.\n')

				$.action('yn')
				xvt.app.form = {
					'fight': { cb:() => {
						xvt.out('\n\n')
						if (/Y/i.test(xvt.entry)) {
							if ($.activate(opponent, true)) {
								$.music('combat' + $.arena--)
								Battle.engage('User', $.online, opponent, menu)
							}
							else {
								$.unlock($.player.id, true)
								menu(!$.player.expert)
							}
						}
						else
							menu(!$.player.expert)
					}, prompt:'Will you fight ' + $.who(opponent, 'him') + '(Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:10 }
				}
				xvt.app.focus = 'fight'
			})
			return

		case 'Y':
			xvt.out('\n')
			Battle.yourstats()
			suppress = true
			break
	}
	menu(suppress)
}

function MonsterFights(): boolean {

	let cost: $.coins
	let monster: active
	let n: number

	if (/D/i.test(xvt.entry)) {
		if ($.player.level < 50) {
			xvt.out('\nYou are not powerful enough to fight demons yet.  Go fight some monsters.\n')
			return
		}

		cost = new $.coins(new $.coins($.money($.player.level)).carry(1, true))

		xvt.out('\nThe ancient necromancer will summon you a demon for ', cost.carry(), '\n')
		if ($.player.coin.value < cost.value) {
			xvt.out('You don\'t have enough!\n')
			return
		}

		$.action('yn')		
		xvt.app.form = {
			'pay': { cb:() => {
				xvt.out('\n\n')
				if (/Y/i.test(xvt.entry)) {
					$.player.coin.value -= cost.value
					$.online.altered = true
					xvt.out('As you hand him the money, it disappears into thin air.\n\n')
					xvt.waste(1250)

					monster = <active>{}
					monster.user = <user>{ id:'' }
					Object.assign(monster.user, require('../etc/summoned demon.json'))
					let l = $.player.level + 2
					if (l >= $.sysop.level)
						l = $.sysop.level - 2
					if ((monster.user.level = l + $.dice(7) - 4) > 99)
						monster.user.level = 99
					cost.value += $.worth($.money(monster.user.level), $.player.cha)

					let n = Math.trunc($.Weapon.merchant.length * $.player.level / 110)
					n = n >= $.Weapon.merchant.length ? $.Weapon.merchant.length - 1 : n
					monster.user.weapon = n + 3
					cost.value += $.worth(new $.coins($.Weapon.name[$.Weapon.merchant[n]].value).value, $.player.cha)

					n = Math.trunc($.Armor.merchant.length * $.player.level / 110)
					n = n >= $.Armor.merchant.length ? $.Armor.merchant.length - 1 : n
					monster.user.armor = n + 2
					cost.value += $.worth(new $.coins($.Armor.name[$.Armor.merchant[n]].value).value, $.player.cha)

					$.reroll(monster.user
						, ($.dice(($.online.int + $.online.cha) / 50) > 1) ? monster.user.pc : $.PC.random('monster')
						, monster.user.level)

					monster.user.spells = [ 7, 9 ]
					if (monster.user.magic) {
						for (let i = 0; i < Object.keys($.Magic.spells).length; i++) {
							if ($.dice(($.player.cha >>2) + 5 * i + $.player.level - monster.user.level) <= monster.user.magic) {
								let spell = $.Magic.pick(i)
								if (!$.Magic.have(monster.user.spells, spell))
									$.Magic.add(monster.user.spells, i)
							}
						}
					}
					if (monster.user.poison) {
						for (let i = 0; i < Object.keys($.Poison.vials).length; i++) {
							if ($.dice(($.player.cha >>2) + 5 * i + $.player.level - monster.user.level) <= monster.user.poison) {
								let vial = $.Poison.pick(i)
								if (!$.Poison.have(monster.user.poisons, vial))
									$.Poison.add(monster.user.poisons, i)
							}
						}
					}

					$.activate(monster)
					monster.user.coin.value += cost.value

					$.profile({ jpg:'arena/' + monster.user.handle.toLowerCase()
						, handle:`${monster.user.handle}`, level:monster.user.level, pc:'contest'
						, effect:'jello'
					})
					$.cat('arena/' + monster.user.handle)

					xvt.out(`The old necromancer summons you a level ${monster.user.level} monster.`, '\n')
					if (isNaN(monster.user.weapon)) xvt.out('\n', $.who(monster, 'He'), $.Weapon.wearing(monster), '.\n')
					if (isNaN(monster.user.armor)) xvt.out('\n', $.who(monster, 'He'), $.Armor.wearing(monster), '.\n')

					xvt.app.focus = 'fight'
					return
				}
				xvt.out(xvt.cyan, 'His eyes glow ', xvt.bright, xvt.red, 'red', xvt.normal
					, xvt.cyan, ' and he says, "', xvt.bright, xvt.white, 'I don\'t make deals!'
					, xvt.normal, xvt.cyan, '"\n', xvt.reset)
				menu()
			}, prompt:'Will you pay (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:10 },
			'fight': { cb:() => {
				xvt.out('\n')
				if (/Y/i.test(xvt.entry)) {
					$.music('combat' + $.arena--)
					Battle.engage('Monster', $.online, monster, menu)
				}
				else {
					$.animated('fadeOut')
					menu()
				}
			}, prompt:'Fight this demon (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:10 }
		}
		xvt.app.focus = 'pay'
	}
	else {
		let mon = $.int(xvt.entry) - 1
		if (mon == monsters.length - 1)
			$.sound('demogorgon')
		monster = <active>{}
		monster.user = <user>{id: ''}
		monster.user.handle = monsters[mon].name
		monster.user.sex = 'I'
		$.reroll(monster.user, monsters[mon].pc, monsters[mon].level)

		monster.user.weapon = monsters[mon].weapon
		monster.user.armor = monsters[mon].armor
		monster.user.spells = []
		if (monsters[mon].spells)
			for (let i = 0; i < monsters[mon].spells.length; i++)
				$.Magic.add(monster.user.spells, monsters[mon].spells[i])

		$.activate(monster)
		if (monsters[mon].adept) monster.adept = monsters[mon].adept
		monster.user.coin.amount = monsters[mon].money.toString()

		$.cat('arena/' + monster.user.handle.toLowerCase())
		$.profile({ jpg:'arena/' + monster.user.handle.toLowerCase()
			, handle:`#${mon + 1} - ${monster.user.handle}`
			, level:monster.user.level, pc:monster.user.pc.toLowerCase()
			, effect:monsters[mon].effect
		})

		xvt.out(`The ${monster.user.handle} is a level ${monster.user.level} ${monster.user.pc}.`, '\n')
		if (isNaN(+monster.user.weapon)) xvt.out('\n', $.who(monster, 'He'), $.Weapon.wearing(monster), '.\n')
		if (isNaN(+monster.user.armor)) xvt.out('\n', $.who(monster, 'He'), $.Armor.wearing(monster), '.\n')

		$.action('yn')
		xvt.app.form = {
			'fight': { cb:() => {
				xvt.out('\n\n')
				if (/Y/i.test(xvt.entry)) {
					$.music('combat' + $.arena--)
					Battle.engage('Monster', $.online, monster, menu)
				}
				else {
					$.animated('fadeOut')
					menu()
				}
			}, prompt:'Will you fight it (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:10 }
		}
		xvt.app.focus = 'fight'
	}

	return true
}

}

export = Arena
