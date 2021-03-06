interface caller {
    who?: string
    reason?: string
}

interface user {
    id: string
    handle?: string

    //  real
    name?: string
    email?: string
    password?: string
    dob?: number
    sex?: string
    joined?: number
    expires?: number
    lastdate?: number
    lasttime?: number
    calls?: number
    today?: number
    expert?: boolean
    emulation?: string
    rows?: number
    access?: string
    remote?: string

    //  playing character
    pc?: string
    gender?: string
    novice?: boolean

    //  current standing
    level?: number
    xp?: number
    xplevel?: number
    status?: string
    blessed?: string
    cursed?: string
    coward?: boolean
    bounty?: coins
    who?: string
    gang?: string
    keyseq?: string
    keyhints?: string[]

    //  character class attributes
    melee?: number
    backstab?: number
    poison?: number
    magic?: number
    steal?: number
    hp?: number
    sp?: number
    str?: number
    maxstr?: number
    int?: number
    maxint?: number
    dex?: number
    maxdex?: number
    cha?: number
    maxcha?: number

    //  character materials
    coin?: coins
    bank?: coins
    loan?: coins
    weapon?: string|number
    toWC?: number
    armor?: string|number
    toAC?: number
    spells?: number[]
    poisons?: number[]
    realestate?: string
    security?: string
    hull?: number
    cannon?: number
    ram?: boolean

    //  statistics
    wins?: number
    immortal?: number
    rating?: number
    //  per roll
  	plays?: number
	jl?: number
	jw?: number
	killed?: number
	kills?: number
	retreats?: number
	tl?: number
	tw?: number
}

interface gang {
    name: string
    members: string[]
    handles: string[]
    genders: string[]
    melee: number[]
    status: string[]
    validated: boolean[]
    win: number
    loss: number
    banner: number
    trim: number
    back: number
    fore: number
}

interface deed {
    pc: string
    deed: string
    date: number
    hero: string
    value: number
}

interface deeds {
    name: string
    description: string
    starting: number
}

interface choice {
    description?: string
}
interface choices {
    [key: string]: choice
}

interface monster {
	name: string
    pc: string
    adept?: number
    hit?: string
    smash?: string
    poisons?: string[]
    spells?: string[]
    level?: number
    weapon?: string|number
    armor?: string|number
    money?: string|number
    effect?: string
}

interface naval {
    name: string
    int: number
    hull: number
    shot: number
    powder: number
    ram: boolean
    money?: string|number
}

interface access {
    F?: string
    M?: string
    calls: number
    minutes: number
    promote: number
    verify: boolean
    bulletin: boolean
    roleplay: boolean
    sysop?: boolean
    weekend?: boolean
    emoji?: string
}

interface armor {
    text: string
    value: string
    ac: number
    armoury?: boolean
    gift?: boolean
    ego_blessed?: string
    ego_cursed?: string
    vs_magic?: number
    vs_melee?: number
}

interface coins {
    value: number
    amount: string
    carry(number?, boolean?): string
    pouch(number): string
}

interface ddd {
    cleric: active
    rooms: [ room[] ]	//	7-10
    map: number			//	0=none, 1=map, 2=magic, 3=Marauder's
    moves: number       //  hero steps (2x backtracking)
    spawn: number       //  2-23
    width: number		//	7-13
}

interface poison {
    power: number
    cost: string
    vial: string
}

interface realestate {
    value: string
    protection: number
}

interface room {
    map: boolean		//	explored?
    occupant: number	//	0=none, 1=trapdoor, 2=deeper dungeon, 3=well, 4=wheel, 5=thief, 6=cleric, 7=wizard
    type: number		//	0=Emp, 1=N-S, 2=W-E, 3=Cav
    giftItem?: string	//	potion, poison, magic, xmagic, chest, map, armor, weapon, Marauder's
    giftValue?: number
    giftID?: boolean	//	undefined, or identified?
    monster?: active[]
}

interface security {
    value: string
    protection: number
}

interface spell {
    cast: number
    mana: number
    enchanted: number
    cost?: string
    wand?: string
}

interface weapon {
    text: string
    value: string
    wc: number
    hit: string
    smash: string
    stab: string
    plunge: string
    shoppe?: boolean
    gift?: boolean
    ego_blessed?: string
    ego_cursed?: string
    vs_magic?: number
    vs_melee?: number
}

interface character {
    melee: number       //  0-4
    backstab: number    //  0-4
    poison: number      //  0-4
    magic: number       //  0-4
    steal: number       //  0-4
    baseStr: number     //  20-80
    baseInt: number     //  20-80
    baseDex: number     //  20-80
    baseCha: number     //  20-80
    toStr: number       //  0-2
    toInt: number       //  0-2
    toDex: number       //  0-2
    toCha: number       //  0-2
    maxStr: number      //  baseStr-99
    maxInt: number      //  baseInt-99
    maxDex: number      //  baseDex-99
    maxCha: number      //  baseCha-99
    specialty?: string  //  meta
    description?: string[]
}

interface active {
    user: user
    altered?: boolean
    pc?: character
    weapon?: weapon
    armor?: armor
    toAC?: number
    toWC?: number
    adept?: number      //  0 - 5: situational modifiers
    str?: number
    int?: number
    dex?: number
    cha?: number
    confused?: boolean
    bp?: number
    hp?: number         //  <0=retreated, 0=killed, >0=alive
    sp?: number
    hull?: number
    effect?: string
}
