/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  GAMBLING authored by: Robert Hurst <theflyingape@gmail.com>              *
\*****************************************************************************/ 

import {sprintf} from 'sprintf-js'

import $ = require('../common')
import xvt = require('xvt')


module Gambling
{
	let casino: choices = {
        'B': { description:'Blackjack' },
        'H': { description:'High Stakes Draw' },
    	'K': { description:'Keno' },
	}
/*
		'C': { description:'Craps' },
		'G': { description:'Greyhound race' },
        'R': { description:'Roulette' },
        'S': { description:'One-armed Bandit' }
*/
	let atm: choices = {
		'D': { },
		'W': { },
		'L': { }
	}
	let pin: boolean

	let game:string
	let payoff = new $.coins(0)

	interface card {
		face:string
		value:number
	}
	const card:card[] = [
		{ face:'*Joker*', value:-1 }, { face:'=Ace=', value:1 },
		{ face:'Two', value:2 }, { face:'Three', value:3 }, { face:'Four', value:4 },
		{ face:'Five', value:5 }, { face:'Six', value:6 }, { face:'Seven', value:7 },
		{ face:'Eight', value:8 }, { face:'Nine', value:9 }, { face:'Ten', value:10 },
		{ face:'!Jack!', value:10 }, { face:'$Queen$', value:10 }, { face:'&King&', value:10 }
	]
	let deck:number[]
	let pile:number

export function menu(suppress = true) {
	if ($.online.altered) $.saveUser($.online)
	if ($.reason) xvt.hangup()

	$.action('casino')
	xvt.app.form = {
        'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
    }
    xvt.app.form['menu'].prompt = $.display('casino', xvt.Green, xvt.green, suppress, casino)
    xvt.app.focus = 'menu'
	pin = false
}

function choice() {
    if ((game = xvt.entry.toUpperCase()) === 'Q') {
		xvt.out('\n')
		require('./main').menu($.player.expert)
		return
	}

	if (xvt.validator.isNotEmpty(casino[game]))
        if (xvt.validator.isNotEmpty(casino[game].description)) {
			xvt.out(' - ', casino[game].description, '\n')
			if ($.access.roleplay) {
				Bet()
				return
			}
		}
	menu(false)
}

function Bet() {
	$.action('wager')
	xvt.app.form = {
		'coin': { cb:amount, max:24 }
	}
	xvt.app.form['coin'].prompt = xvt.attr('Bet ', xvt.white, '[', xvt.uline, 'MAX', xvt.nouline, '=', $.player.coin.carry(), ']? ')
	xvt.app.focus = 'coin'
}

function amount() {
	let ace:number = 0
	xvt.out('\n')

	if ((+xvt.entry).toString() === xvt.entry) xvt.entry += 'c'
	let amount = new $.coins(0)
	if (/=|max/i.test(xvt.entry))
		amount.value = $.player.coin.value
	else
		amount.value = Math.trunc(new $.coins(xvt.entry).value)
	if (amount.value < 1 || amount.value > $.player.coin.value) {
		xvt.beep()
		menu($.player.expert)
		return
	}

	$.player.coin.value -= amount.value

	switch (game) {
		case 'B':
			shuffle()

			let player:number[] = []
			let myhand:number
			let dealer:number[] = []
			let value:number

			player.push(deck[pile++])
			dealer.push(deck[pile++])
			player.push(deck[pile++])
			dealer.push(deck[pile++])
			xvt.out(xvt.green, '\nDealer\'s hand: ',
				xvt.red, '[', xvt.white, 'DOWN', xvt.red, '] ',
				xvt.red, '[', xvt.white, card[dealer[1]].face, xvt.red, ']\n')
			myhand = ShowHand(1, player)

			if (myhand == 21) {
				$.sound('cheer')
				payoff.value = 2 * amount.value
				xvt.out(xvt.bright, xvt.cyan, '\nBlackjack!!\n\n', xvt.reset)
				xvt.waste(1000)

				value = ShowHand(0, dealer)
				if (value == 21) {
					$.sound('boo')
					xvt.out('\nDealer has Blackjack!  You\'re a loser.\n')
					xvt.waste(1000)
				}
				else {
					xvt.out('\nYou win ', payoff.carry(), '!\n')
					$.player.coin.value += payoff.value + amount.value
				}
				break
			}

			$.action('blackjack')
			xvt.app.form = {
				'draw': { cb: () => {
					xvt.out('\n\n')
					switch (xvt.entry.toUpperCase()) {
						case 'D':
							$.player.coin.value -= amount.value
							amount.value *= 2
							payoff.value = amount.value
							xvt.entry = 'S'
						case 'H':
							player.push(deck[pile++])
							myhand = ShowHand(1, player)
							if (myhand > 21) {
								xvt.out('You bust!\n')
								xvt.entry = 'S'
								amount.value = 0
							}
							else if (player.length == 5) {
								$.sound('cheer')
								payoff.value = 2 * amount.value
								xvt.out('Five card charley!  You win ', payoff.carry(), '!\n')
								$.player.coin.value += payoff.value + amount.value
								menu()
								return
							}
							else if (myhand == 21)
								xvt.entry = 'S'
							else if (xvt.entry !== 'S') {
								xvt.app.refocus()
								return
							}
							xvt.out('\n')
							break
					}
					if (/S/i.test(xvt.entry)) {
						while ((value = ShowHand(0, dealer)) < 17 && amount.value) {
							dealer.push(deck[pile++])
							xvt.waste(1000)
						}
						xvt.out('\n')
						if (amount.value) {
							if (value > 21) {
								$.sound('cheer')
								payoff.value = amount.value
								xvt.out('Dealer breaks!  You win ', payoff.carry(), '!\n')
								$.player.coin.value += payoff.value + amount.value
							}
							else if (myhand > value) {
								$.sound('cheer')
								payoff.value = amount.value
								xvt.out('You win ', payoff.carry(), '!\n')
								$.player.coin.value += payoff.value + amount.value
							}
							else if (myhand < value) {
								$.sound('boo')
								xvt.out('You lose.\n')
							}
							else {
								xvt.out('You tie.  It\'s a push.\n')
								$.player.coin.value += amount.value
							}
						}
						menu()
					}
				}, eol:false, max:1 }
			}
			xvt.app.form['draw'].prompt = xvt.attr($.bracket('H', false), xvt.cyan, 'it, ',
				$.bracket('S', false), xvt.cyan,'tand')
			xvt.app.form['draw'].match = /H|S/i
			if ($.player.coin.value >= amount.value && (ace > 0 || myhand < 12)) {
				xvt.app.form['draw'].prompt += xvt.attr(', ', $.bracket('D', false), xvt.cyan, 'ouble down')
				xvt.app.form['draw'].match = /D|H|S/i
			}
			xvt.app.form['draw'].prompt += ': '
			xvt.app.focus = 'draw'
			return

		case 'H':
			shuffle(true)

			$.action('keypad')
			xvt.app.form = {
				'pick': { cb: () => {
					let dealer: number
					let pick = +xvt.entry
					if (isNaN(pick) || pick < 1 || pick > 54) {
						xvt.out(' ?? ')
						xvt.app.refocus()
						return
					}
					$.sound(card[deck[--pick]].value > 0 ? 'click' : 'boom', 6)
					xvt.out(' - ', xvt.bright,
						xvt.red, '[', xvt.white, card[deck[pick]].face, xvt.red, ']',
						xvt.reset, '\n'
					)
					xvt.waste(500)

					xvt.out('Dealer picks card #')
					while ((dealer = $.dice(54)) - 1 == pick);
					$.sound(card[deck[--dealer]].value > 0 ? 'click' : 'boom', 6)
					xvt.out(dealer.toString(), ' - ',
						xvt.red, '[', xvt.white, card[deck[dealer]].face, xvt.red, ']',
						xvt.reset, '\n\n'
					)
					xvt.waste(500)

					if (card[deck[pick]].value > card[deck[dealer]].value) {
						$.sound('cheer')
						payoff.value = amount.value * (card[deck[dealer]].value > 0
							? Math.trunc((card[deck[pick]].value - card[deck[dealer]].value - 1) / 4) + 1
							: 25
						)
						xvt.out('You win ', payoff.carry(), '!\n')
						$.player.coin.value += payoff.value + amount.value
					}
					else if (card[deck[pick]].value < card[deck[dealer]].value) {
						if (card[deck[pick]].value < 0) {
							xvt.out('The joke is on you.\n\n')
							$.sound('oops', 12)
							xvt.out(xvt.bright, xvt.yellow, 'You die laughing.\n', xvt.reset)
							$.sound('laugh', 24)
							$.reason = 'died laughing'
							xvt.hangup()
						}
						$.sound('boo')
						xvt.out('You lose.\n')
					}
					else {
						xvt.out('You tie.  It\'s a push.\n')
						$.player.coin.value += amount.value
					}
					xvt.waste(500)
					menu()
				}, prompt:'Pick a card (1-54)? ', max:2 }
			}
			xvt.app.focus = 'pick'
			return

		case 'K':
			let point: number
			let picks: number[] = []
			$.action('keypad')
			xvt.app.form = {
				'point': { cb: () => {
					point = +xvt.entry
					if (point < 1 || point > 10) {
						menu()
						return
					}
					xvt.out(xvt.green, `\n\nKENO PAYOUT for a ${point} spot game:\n\n`)
					xvt.out(xvt.bright, 'MATCH     PRIZE\n', xvt.cyan)
					switch (point) {
						case 1:
							xvt.out('   1         $1\n')
							break
						case 2:
							xvt.out('   2         $9\n')
							break
						case 3:
							xvt.out('   3        $20\n')
							xvt.out('   2          2\n')
							break
						case 4:
							xvt.out('   4        $50\n')
							xvt.out('   3          5\n')
							xvt.out('   2          1\n')
							break
						case 5:
							xvt.out('   5       $400\n')
							xvt.out('   4         10\n')
							xvt.out('   3          2\n')
							break
						case 6:
							xvt.out('   6      $1000\n')
							xvt.out('   5         50\n')
							xvt.out('   4          5\n')
							xvt.out('   3          1\n')
							break
						case 7:
							xvt.out('   7      $4000\n')
							xvt.out('   6         75\n')
							xvt.out('   5         15\n')
							xvt.out('   4          2\n')
							xvt.out('   3          1\n')
							break
						case 8:
							xvt.out('   8      10000\n')
							xvt.out('   7        500\n')
							xvt.out('   6         40\n')
							xvt.out('   5         10\n')
							xvt.out('   4          2\n')
							break
						case 9:
							xvt.out('   9     $25000\n')
							xvt.out('   8       2500\n')
							xvt.out('   7        100\n')
							xvt.out('   6         20\n')
							xvt.out('   5          5\n')
							xvt.out('   4          1\n')
							break
						case 10:
							xvt.out('  10    $100000\n')
							xvt.out('   9       4000\n')
							xvt.out('   8        400\n')
							xvt.out('   7         25\n')
							xvt.out('   6         10\n')
							xvt.out('   5          2\n')
							xvt.out(' none         5\n')
							break
					}
					xvt.out(xvt.reset, '\nodds of winning a prize in this game are 1:', 
						`${[4, 16.6, 6.55, 3.86, 10.33, 6.19, 4.22, 9.79, 6.55, 9.04][point - 1]}\n`)
					xvt.app.focus = 'pick'
				}, prompt:'How many numbers (1-10)? ', max:2 },
				'pick': { cb: () => {
					let pick = +xvt.entry
					if (xvt.entry === '') {
						do {
							pick = $.dice(80)
						} while (picks.indexOf(pick) >= 0)
						xvt.out(`${pick}`)
					}
					if (pick < 1 || pick > 80) {
						$.beep()
						xvt.app.refocus()
						return
					}
					if (picks.indexOf(pick) >= 0) {
						$.beep()
						xvt.app.refocus()
						return
					}
					$.sound('click')
					picks.push(pick)
					if (picks.length == point) {
						xvt.out('\n\n', xvt.bright, xvt.yellow,
							'Here comes those lucky numbers!\n', xvt.reset)
						xvt.waste(500)

						let balls: number[] = []
						let hits = 0
						payoff.value = 0

						for (let i = 0; i < 20; i++) {
							if (i % 5 == 0) xvt.out('\n')
							do {
								pick = $.dice(80)
							} while (balls.indexOf(pick) >= 0)
							if (picks.indexOf(pick) >= 0) {
								hits++
								$.sound('max')
								xvt.out(' *', xvt.bright, xvt.blue, '[',
									xvt.yellow, sprintf('%02d', pick),
									xvt.blue, ']', xvt.reset, '* ')
							}
							else {
								xvt.out(xvt.faint, xvt.cyan, '  [',
									xvt.normal, sprintf('%02d', pick),
									xvt.faint, ']  ', xvt.reset)
							}
							xvt.waste(250)
						}

						xvt.out('\n')
						switch (point) {
							case 1:
								if (hits == 1)
									payoff.value = 2 * amount.value
								break
							case 2:
								if (hits == 2)
									payoff.value = 9 * amount.value
								break
							case 3:
								if (hits == 3)
									payoff.value = 20 * amount.value
								if (hits == 2)
									payoff.value = 2 * amount.value
								break
							case 4:
								if (hits == 4)
									payoff.value = 50 * amount.value
								if (hits == 3)
									payoff.value = 5 * amount.value
								if (hits == 2)
									payoff.value = 1 * amount.value
								break
							case 5:
								if (hits == 5)
									payoff.value = 400 * amount.value
								if (hits == 4)
									payoff.value = 10 * amount.value
								if (hits == 3)
									payoff.value = 2 * amount.value
								break
							case 6:
								if (hits == 6)
									payoff.value = 1000 * amount.value
								if (hits == 5)
									payoff.value = 50 * amount.value
								if (hits == 4)
									payoff.value = 5 * amount.value
								if (hits == 3)
									payoff.value = 1 * amount.value
								break
							case 7:
								if (hits == 7)
									payoff.value = 4000 * amount.value
								if (hits == 6)
									payoff.value = 75 * amount.value
								if (hits == 5)
									payoff.value = 15 * amount.value
								if (hits == 4)
									payoff.value = 2 * amount.value
								if (hits == 3)
									payoff.value = 1 * amount.value
								break
							case 8:
								if (hits == 8)
									payoff.value = 10000 * amount.value
								if (hits == 7)
									payoff.value = 500 * amount.value
								if (hits == 6)
									payoff.value = 40 * amount.value
								if (hits == 5)
									payoff.value = 10 * amount.value
								if (hits == 4)
									payoff.value = 2 * amount.value
								break
							case 9:
								if (hits == 9)
									payoff.value = 25000 * amount.value
								if (hits == 8)
									payoff.value = 2500 * amount.value
								if (hits == 7)
									payoff.value = 100 * amount.value
								if (hits == 6)
									payoff.value = 20 * amount.value
								if (hits == 5)
									payoff.value = 5 * amount.value
								if (hits == 4)
									payoff.value = 1 * amount.value
								break
							case 10:
								if (hits == 10)
									payoff.value = 100000 * amount.value
								if (hits == 9)
									payoff.value = 4000 * amount.value
								if (hits == 8)
									payoff.value = 400 * amount.value
								if (hits == 7)
									payoff.value = 25 * amount.value
								if (hits == 6)
									payoff.value = 10 * amount.value
								if (hits == 5)
									payoff.value = 2 * amount.value
								if (hits == 0)
									payoff.value = 5 * amount.value
								break
						}
						if (payoff.value) {
							$.sound('cheer')
							xvt.out('\nYou win ', payoff.carry(), '!\n')
							$.player.coin.value += payoff.value
							xvt.waste(500)
						}
						else
							$.sound('boo')
						menu()
					}
					else {
						xvt.app.form['pick'].prompt = `Pick #${picks.length + 1} [1-80]: `
						xvt.app.refocus()
					}
				}, prompt: 'Pick #1 [1-80]: ', max:2 }
			}
			xvt.app.focus = 'point'
			return
	}

	menu()

	function ShowHand(who: number, hand: number[]) {
		let value:number = 0
		ace = 0

		xvt.out(who ? xvt.bright : xvt.reset, xvt.green, ['Dealer', 'Player'][who], '\'s hand: ', xvt.red)
		for (let i = 0; i < hand.length; i++) {
			xvt.out('[', xvt.white, card[hand[i]].face, xvt.red, '] ')
			value += card[hand[i]].value
			if (card[hand[i]].value == 1)
					ace++
		}
		for (let i = 0; i < ace && value + 10 < 22; i++)
				value += 10
		xvt.out(xvt.reset, `= ${value}\n`)
		xvt.waste(500)
		return(value)
	}
}

function shuffle(jokers = false) {
	deck = [ 0,
		1,2,3,4,5,6,7,8,9,10,11,12,13,
		1,2,3,4,5,6,7,8,9,10,11,12,13,
		1,2,3,4,5,6,7,8,9,10,11,12,13,
		1,2,3,4,5,6,7,8,9,10,11,12,13,
		0 ]
	xvt.out(xvt.faint, '\nShuffling a new deck ')
	xvt.waste(250)
	let cut = $.dice(6) + 4
	for (let n = 0; n < cut; n++) {
		if (jokers)
			for(let i = 0; i < 54; i++) {
				let j = $.dice(54) - 1
				;[ deck[i], deck[j] ] = [ deck[j], deck[i] ];
			}
		else
			for(let i = 1; i < 53; i++) {
				let j = $.dice(52)
				;[ deck[i], deck[j] ] = [ deck[j], deck[i] ];
			}
		xvt.out('.')
		xvt.waste(20)
	}
	xvt.out(' Ok.\n', xvt.reset)
	xvt.waste(250)
	pile = 1
}

}

export = Gambling
