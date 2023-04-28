/* Object definitions */

class Character {
	constructor(name,pronouns){
		this.name = name;
		this.harmMax = 4;
		this.harmCurrent = 0;
		this.weapon = new Weapon("Fists",0);
		this.dead = false;
		[this.pronounSub, this.pronounObj, this.pronounPoss] = pronouns;
	}
}

class NPC extends Character {
	constructor(name,facts,factKeywords,pronouns){
		super(name,pronouns);
		this.tension = 2;
		this.hostility = 4;
		this.interest = 0;
		this.facts = facts;
		this.factFlags = []; // Tracks which facts have been given
		for (let i = 0; i < this.facts.length; i++) {
			this.factFlags.push("unknown"); // sets all facts to unknown as default state
		}
		this.factKeywords = factKeywords;
	}

	statsPrintout(){
		const printoutStr = document.createTextNode(` -- ${this.harmCurrent}/${this.harmMax} Harm`);
		const statsDiv = document.querySelector('#npc-stats');
		const p = document.createElement("p");
		const b = document.createElement("b");
		b.textContent = this.name;
		p.append(b,printoutStr); // Assembles the statblock headline
		statsDiv.replaceChildren(p);
		const armed = document.createElement("p");
		armed.textContent = `Armed with ${(this.weapon.name === "Fists")? '' : 'the'} ${this.weapon.name}`;
		statsDiv.appendChild(armed);
		const tension = document.createElement("p");
		const tensionDesc = [
			"The situation is calm.",
			"The situation is strained.",
			"The situation is tense.",
			"The situation is charged.",
			"The situation is volatile.",
			"The situation is chaotic.",
		];
		if(this.tension > 5) { tension.textContent = "The situation is chaotic."; } else { tension.textContent = tensionDesc[this.tension]; }
		statsDiv.appendChild(tension);
	}

	addFact(fact,keyword){ // adds a new fact to the NPC's array (used to evolve the scene and create new info)
		this.facts.push(fact);
		const factIndex = this.facts.indexOf(fact);
		this.factFlags.splice(factIndex,0,"unknown"); // create a new flag at that index (splicing instead of pushing, to be safe)
		this.factKeywords.splice(factIndex,0,keyword); // add the matching keyword
	}
}

class Player extends Character {
	constructor(stats,name,pronouns){
		super(name,pronouns);
		[this.hot, this.cold, this.hard, this.sharp, this.weird] = stats;
		this.supplies = false;
	}

	statsPrintout(){
		const statsDiv = document.querySelector('#player-stats');

		const p = document.createElement("p");
		const b = document.createElement("b");
		b.textContent = this.name;
		const printoutStr = document.createTextNode(` -- ${this.harmCurrent}/${this.harmMax} Harm`);
		p.append(b,printoutStr); // Assembles the statblock headline
		statsDiv.replaceChildren(p);

		const statlist = document.createElement("ul");
		statlist.className = "stats-list";
		statsDiv.appendChild(statlist);
		
		const hotLi = document.createElement("li");
		const coldLi = document.createElement("li");
		const hardLi = document.createElement("li");
		const sharpLi = document.createElement("li");
		const weirdLi = document.createElement("li");
		
		hotLi.textContent = `Hot: ${this.hot}`;
		coldLi.textContent = `Cold: ${this.cold}`;
		hardLi.textContent = `Hard: ${this.hard}`;
		sharpLi.textContent = `Sharp: ${this.sharp}`;
		weirdLi.textContent = `Weird: ${this.weird}`;

		statlist.append(hotLi,coldLi,hardLi,sharpLi,weirdLi);
	}
}

class Weapon {
	constructor(name, damage){
		this.name = name;
		this.damage = damage;
	}
}

class PlayerMove {
	constructor(name, stat, hitFn, midFn, missFn){
		this.name = name;
		this.hit = hitFn;
		this.mid = midFn;
		this.miss = missFn;
		this.stat = stat;
	}

	execute(){
		const random = rollDice(currentPlayer[this.stat]); // pulls the stat property that matches the stat string
		if (random <= 6) {
			this.miss();
		} else if (random <=9) {
			this.mid();
		} else if (random >= 10) {
			this.hit();
		} 
		resultLog(`Making the move ${this.name} with +${this.stat}...`); // Put here so that it displays first in the log (because of prepending)
	}
}

/* Utility functions */
function rand(max){
	return Math.floor(Math.random()*max) + 1;
}

function rollDice(mod){
	const result = rand(6) + rand(6);

	if (result >= 2 && result <= 12) {
		resultLog(`Rolled ${result} for a total of ${result + mod}`);
		return result + mod;
	} else { 
		console.error(`Result of ${result} is invalid, rerolling.`);
		rollDice(mod); //reroll on error
	}
}

function resultLog(text){
	const p = document.createElement("p");
	p.textContent = text;
	log.prepend(p); // uses prepend for reverse ordering on moves
}

function firstCap([ first='', ...rest ]) {
  return [ first.toUpperCase(), ...rest ].join('');
}

function cleanup(){
	log.prepend(document.createElement("hr")); // adds a separator in the log
	options.replaceChildren();
	if (currentPlayer.dead || mainNPC.dead) { //Death ending
		resultLog('Death visits this valley. Click \"Reset\" to play again.');
		if (currentPlayer.dead) {
			resultLog('Darkness overtakes you, as you bleed out for the supplies you wanted so desperately.');
		}

		if (!currentPlayer.dead) {
			resultLog(`You made it out, ${harmDesc[currentPlayer.harmCurrent]}; the supplies are yours, at the low price of blood.`);
		}
		
		if (mainNPC.dead) {
			resultLog(`${mainNPC.name} falls to ${mainNPC.pronounPoss} knees, unable to stand. Violence has won out today.`);
		}
		return;
	}

	if (currentPlayer.supplies) { // bargain ending
		resultLog('Click \"Reset\" to play again.');
		resultLog(`You strike up a bargain with ${mainNPC.name}: you get some of the supplies, and ${mainNPC.pronounSub} gets your services protecting ${mainNPC.pronounObj} enclave during the next month. Life continues for another day.`);
		return;
	}

	if (mainNPC.tension > 7) { mainNPC.tension = 7; } // hard caps for tension and hostility to avoid dragging out the game
	if (mainNPC.hostility > 8) { mainNPC.hostility = 8; }

	const actionsPossible = [];

	/* Generate possible actions */
	if (mainNPC.tension >= 1) { actionsPossible.push("readPerson"); actionsPossible.push("readSitch"); }
	if (mainNPC.hostility < 5 && mainNPC.tension > 0) { actionsPossible.push("iceDown"); }
	if (mainNPC.hostility >= 3) {
		if(currentPlayer.weapon.name !== "Knife") { actionsPossible.push("grabKnife") } // can't grab a knife if you already have one!
	}
	// moving this to an "always possible" state to avoid player being locked out of higher-tension options before bargain is available
	actionsPossible.push("sparkUp");
	actionsPossible.push("hearSkies");

	function arrayMatch(str,obj) { // function that returns index of the first fact that contains the substring (to check against factFlags)
		const regex = new RegExp(`${str}`);
		return obj.facts.findIndex(fact => fact.match(regex));
	}
	for (word of mainNPC.factKeywords) { // pushes keywords for all unlocked facts into the array
		switch(word) { // skips word if the stuation doesn't suit the unlocked fact
			case 'violence':
				if (mainNPC.tension > 4) { continue; }
				break;
			default:
				break;
		}
		if (mainNPC.factFlags[arrayMatch(word,mainNPC)] === "known") {
			actionsPossible.push(word);
		}
	}

	for (word of scene.factKeywords) { // pushes keywords for unlocked scene facts
		switch(word) { // skips word if the stuation doesn't suit the unlocked fact
			case 'shotgun':
				if (mainNPC.tension > 4) { continue; }
				break;
			default:
				break;
		}
		if (scene.factFlags[arrayMatch(word,scene)] === "known") {
			actionsPossible.push(word);
		}
	}
	console.log(actionsPossible);

	/* Populate the option buttons array, then spawn buttons */
	const optionBtns = [];

	if (mainNPC.hostility >= 1 && mainNPC.tension > 0) {
		optionBtns.push("bashHeads"); // violence gets special priority 
	}
	if (mainNPC.hostility < 1 && mainNPC.interest >= 2) {
		optionBtns.push("bargain"); // peaceful wincon also gets pushed to the front if unlocked
	}

	for (i = 0; i < 3; i++) {
		randOpt = rand(actionsPossible.length)-1;
		optionBtns.push(actionsPossible[randOpt]);
		actionsPossible.splice(randOpt,1); // remove option from possible actions to avoid duplicates
	}

	for (option of optionBtns) { // spawn a button for all referenced actions in the array
		spawnManager(option);
	}

	mainNPC.statsPrintout();
	currentPlayer.statsPrintout();
}

function spawnManager(action) { // spawns buttons into the options div
	switch(action) {
		case 'bashHeads':
			spawnMove(bashHeads,"Bring violence");
			break;
		case 'readPerson':
			spawnMove(readPerson, `Size up ${mainNPC.name}`);
			break;
		case 'readSitch':
			spawnMove(readSitch, `Check ${scene.name.toLowerCase()}.`);
			break;
		case 'iceDown':
			spawnMove(iceDown, "Cool the tension.");
			break;
		case 'sparkUp':
			spawnMove(sparkUp, "Spark a connection.");
			break;
		case 'hearSkies':
			spawnMove(hearSkies, "Listen to the skies within.");
			break;
		case 'grabKnife':
			spawnAction(() => {
				escalate(2);
				grabWeapon(currentPlayer,"knife");
				cleanup();
			},"Grab your knife");
			break;
		case 'bargain': // pacifist wincon
			spawnAction(() => {
				currentPlayer.supplies = true;
				cleanup();
			},"Strike a bargain");
			break;
		/* Read a sitch facts */
		case 'shotgun':
			spawnAction(() => {
				escalate(4);
				grabWeapon(currentPlayer,"shotgun");
				resultLog(`${mainNPC.name} wasn't keeping enough of an eye on you. You quickly close the distance to the shotgun.`);
				cleanup();
			},"Go for the shotgun");
			break;
		case 'alone':
			spawnAction(() => {
				resultLog('They are alone <placeholder>');
				cleanup();
			},"ALONE placeholder");
			break;
		/* Read a person facts */
		case 'personal':
			spawnAction(() => {
				resultLog(`In the dim light, ${mainNPC.pronounObj} eyes open. Looking back at you, ${mainNPC.pronounSub} cryptically explains, "It's the Green."`);
				mainNPC.factFlags[3] = "known"; // free unlock of the fact about the Green
				mainNPC.factFlags[0] = "used"; // consume this fact after it's used once
				cleanup();
			},`Ask what ${mainNPC.pronounObj} personal stake is`);
			break;
		case 'owl':
			spawnAction(() => {
				resultLog(`You explain that you aren't strictly loyal to Athena, but wear the gang's patch to benefit from their reputation. ${firstCap(mainNPC.pronounSub)} doesn't like it, but understands. Briefly, ${mainNPC.pronounSub} touches a star-shaped brand on ${mainNPC.pronounObj} face.`);
				mainNPC.factFlags[2] = "known"; // free unlock of the fact about the brand
				mainNPC.tension += 1;
				mainNPC.factFlags[1] = "used";
				cleanup();
			},`Explain your loose affiliation with Athena`);
			break;
		case 'star':
			spawnAction(() => {
				resultLog(`${firstCap(mainNPC.pronounSub)} starts. "Nothing of your concern. The past is the past." However, ${mainNPC.pronounSub} seems glad you noticed ${mainNPC.pronounObj} scar.`);
				mainNPC.tension += 1;
				mainNPC.interest += 1;
				mainNPC.hostility -= 1;
				mainNPC.factFlags[2] = "used";
				cleanup();
			},`Ask about the brand`);
			break;
		case 'inscription':
			spawnAction(() => {
				resultLog(`${mainNPC.name} nods; ${mainNPC.pronounSub} lets out a breath and gives a brief explanation.
				"The Green is a way of life. A hope in a miracle, a plan to begin to rebuild this world. We won't let anyone stop it."`);
				mainNPC.hostility -= 2;
				mainNPC.factFlags[3] = "used";
				cleanup();
			},"Ask about the Green");
			break;
		case 'violence':
			spawnAction(() => {
				resultLog(`You see ${mainNPC.pronounPoss} desire for peace, and appeal to it; ${mainNPC.pronounSub} acknowledges it but doesn't back down.`);
				mainNPC.hostility -= 2;
				mainNPC.factFlags[4] = "used";
				cleanup();
			}, "Suggest peace");
			break;
		default:
			break;
	}
}

/* Action spawns */
function spawnMove(move,text){
	const moveBtn = document.createElement("button");
	moveBtn.textContent = `${text} (${move.name} +${move.stat})`;
	moveBtn.addEventListener('click', () => {
		move.execute();
		cleanup();
	});
	options.appendChild(moveBtn);
}

function spawnAction(fn,text){ // use for actions that aren't basic moves
	const moveBtn = document.createElement("button");
	moveBtn.textContent = `${text}`;
	moveBtn.addEventListener('click', fn);
	options.appendChild(moveBtn);
}

/* Basic Moves */
const bashHeads = new PlayerMove('Bash Heads','hard',
	() => dealHarm(mainNPC,currentPlayer.weapon.damage), //Hit result
	() => { //Mixed result, trade blows
		dealHarm(mainNPC,currentPlayer.weapon.damage);
		dealHarm(currentPlayer,mainNPC.weapon.damage);
		resultLog("You both trade blows.");
		mainNPC.tension += 1;
	},
	() => { //Miss result
		dealHarm(currentPlayer,mainNPC.weapon.damage);
		mainNPC.tension += 1;
	});

const readPerson = new PlayerMove('Read a Person','sharp',
	() => {
		const facts = giveFact(3,mainNPC);
		for (fact of facts) { resultLog(fact) };
	},
	() => {
		if(rand(3) > 2) { escalate(1); }
		resultLog(`${mainNPC.name} doesn't like your prying.`);
		const facts = giveFact(1,mainNPC);
		for (fact of facts) { resultLog(fact) };
	},
	() => { 
		escalate(1);
		resultLog(`${mainNPC.name} lets nothing slip.`);
	});

const readSitch = new PlayerMove('Read the Situation', 'sharp',
	() => {
		const facts = giveFact(3,scene);
		for (fact of facts) { resultLog(fact) };
	}, 
	() => {
		const facts = giveFact(1,scene);
		for (fact of facts) { resultLog(fact) };
	},
	() => {
		resultLog(futureBadness());
	});

const iceDown = new PlayerMove('Ice Down', 'cold',
	() => { 
		mainNPC.tension -= 2;
		mainNPC.hostility -= 1;
		resultLog("The tension settles a bit.");
	},
	() => { 
		mainNPC.tension -= 2;
		mainNPC.hostility += 1;
		resultLog(`The tension settles, but ${mainNPC.name} looks at you with increased suspicion.`);
	},
	() => { 
		mainNPC.hostility += 1;
		resultLog(`${mainNPC.name} eyes you with more wariness.`);
	});

const sparkUp = new PlayerMove('Spark Up', 'hot',
	() => {
		mainNPC.interest += 1;
		mainNPC.hostility -= 1;
		mainNPC.tension += 1;
		resultLog(`You catch ${mainNPC.name}'s attention, and ${mainNPC.pronounSub} studies you with more focused intent.`);
	},
	() => {
		mainNPC.hostility -= 1;
		mainNPC.tension += 1;
		resultLog(`The connection between you intensifies.`);
	},
	() => {
		mainNPC.tension += 1;
		mainNPC.hostility += 1;
		resultLog(`${firstCap(mainNPC.pronounSub)} views your attempts to connect with grave suspicion.`);
	});

const hearSkies = new PlayerMove('Hear the Skies', 'weird',
	() => {
		resultLog(giveFact(1,weirdnessClear));
		resultLog(`${weirdnessClear.name} opens above your mind, and you feel a moment in your mind's eye.`);
		mainNPC.tension -= 1;
	},
	() => {
		resultLog(giveFact(1,weirdnessConfusing));
		resultLog(`${weirdnessConfusing.name} boils within your heart; nothing you feel is clear.`);
	},
	() => {
		resultLog(futureBadness());
		resultLog(`You see a dread portent in your mind's eye.`);
	});

/* Consequences/effects */
function dealHarm(target,damage) {
	resultLog(`${target.name} takes ${damage} Harm!`);
	target.harmCurrent += damage;
	
	if (target.harmCurrent >= target.harmMax) {
		target.dead = true;
		target.harmCurrent = 4;
	}

	target.statsPrintout();
}

function giveFact(num,target){
	let factsArray = target.facts.slice();
	const returnArray = [];

	/* prunes facts that you've already encountered from the array */
	for (const [index,value] of target.factFlags.entries()) {
		if (value !== "unknown") {
			factsArray[index] = 'delete'; // mark already-known facts for deletion
		}
	}
	factsArray = factsArray.filter(i => i !== 'delete'); // remove all marked items

	/* loops through the array of facts you haven't learned, and pushes random ones to the return array */
	let i = 0;
	while (i < num && factsArray.length > 0) {
		const index = rand(factsArray.length) - 1; // needs offset to work with array indexing from 0
		returnArray.push(factsArray[index]);
		
		const flagIndex = target.facts.indexOf(factsArray[index]);
		target.factFlags[flagIndex] = "known"; // flag the fact as known

		factsArray.splice(index,1); // remove fact from the array so it can't be selected again
		i++;
	}
	return (returnArray.length > 0 ? returnArray : [`Nothing more to learn about ${target.name.toLowerCase()}.`]);
}

function grabWeapon(character, weapon){
	resultLog(`${character.name} grabs ${character.pronounPoss} ${weapon}.`);
	switch(weapon) {
		case 'knife':
			character.weapon = new Weapon("Knife",1);
			break;
		case 'axe':
			character.weapon = new Weapon("Axe",2);
			break;
		case 'shotgun':
			character.weapon = new Weapon("Shotgun",3);
			break;
		default:
			break;
	}
	character.statsPrintout();
}

function escalate(num) {
	if (mainNPC.tension >= 7) {
		dealHarm(currentPlayer,mainNPC.weapon.damage);
		resultLog(`${mainNPC.name} lashes out!`);
		return;
	}

	resultLog(`The tension grows. What does ${currentPlayer.name} do?`);
	mainNPC.tension += num;

	if (mainNPC.weapon.name === "Fists" && mainNPC.tension >= 4) {
		resultLog(`${mainNPC.name} settles into a fighting stance, in response.`);
		grabWeapon(mainNPC,"axe");
	}
}

function futureBadness() {
	const badness = [
		"A cloud of dust kicks up on the horizon. Raiders on their way to the village before too long.",
		"The howl of a genbeast shivers through the air, somewhere not here.",
		"You feel a prickling behind your temples, where a sensation of minute but worrisome pain trembles."
	];

	return badness[rand(badness.length)-1]; // need to give this more teeth but descriptions will do for now
}

/* Character definitions */
let currentPlayer; // creating as let in order to allow for reassignment to empty object on reset
let mainNPC;
let scene;
const harmDesc = ["completely unscathed", "injured yet whole", "seriously wounded", "barely alive"]; //Harm descriptions corresponding to harm levels via array index

const npcName = "Hooksnap";
const npcPronouns = ['she','her','her'];
const npcFacts = [
	`You notice ${npcName} is unusually protective of the supplies; this isn't just practical, it's personal.`,
	`${npcName} is eyeing you with suspicion, focusing on your owl shoulder patch.`,
	`There's a faint star-shaped scar on ${npcName}'s temple; it's not irregular enough to be natural--it's a brand.`,
	`The axe at ${npcName}'s side is sharp, and also engraved with the inscription "Pride of the Green".`,
	`${npcName} eyes you with concern. ${firstCap(npcPronouns[0])} would avoid violence if possible.`
]; // using temp variables for these because the characters are initialized in setup and cannot be referenced yet
const npcFactsKey = ["personal", "owl", "star", "inscription", "violence"];

/* Page area shorthands */
const options = document.querySelector('#move-options');
const log = document.querySelector("#move-resolution");

/* Page-load setup */
function setup(){
	currentPlayer = new Player([1,1,2,0,-1],"Shiner",['he','him','his']);
	mainNPC = new NPC(npcName,npcFacts,npcFactsKey,npcPronouns); // keeping this generic so that it can theoretically be modular

	scene = {
		name: "The poisoned hills",
		facts: [
			`There is a shotgun behind one of the crates.`,
			`You don't see anyone else around to back ${mainNPC.name} up. ${firstCap(mainNPC.pronounSub)} stands alone.`,
		],
		factFlags: ['unknown','unknown'],
		factKeywords: ['shotgun','alone'],
	}

	weirdnessClear = {
		name: "The ambient strangeness",
		facts: [
			`Lush and green, a future, understanding will come.`,
			`The way of peace aids compatibility.`,
			`A star will spark interest.`,
		],
		factFlags: ['unknown','unknown','unknown'],
	}

	weirdnessConfusing = {
		name: "A void of ambient chaos",
		facts: [
			`The bird, talons stained by blood.`,
			`An instrument of death hanging over all.`,
			`Isolation. A flame burns alone.`,
		],
		factFlags: ['unknown','unknown','unknown'],
	}

	currentPlayer.statsPrintout();
	mainNPC.statsPrintout();
	log.replaceChildren();
	
	const reset = document.querySelector("#reset");
	reset.addEventListener('click', () => {
		currentPlayer = {}; // clears the character objects for re-initialization
		mainNPC = {};
		setup();
	});

	resultLog(`${mainNPC.name} glares down at you, one foot on the box of supplies. ${firstCap(mainNPC.pronounSub)} grunts, "No deal. You don't have anything I want." What does ${currentPlayer.name} do?`);
	cleanup();
}

setup();