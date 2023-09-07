'use strict';

let rng = (() => {

let entropy = 0;
let entropy_size = 1;
// invariant: 1 <= entropy_size <= 2**53 and 0 <= entropy < entropy_size

let random_bit = this.crypto ? () => crypto.getRandomValues(new Uint8Array(1))[0] & 1 : () => Math.round(Math.random());

const SAFETY_MARGIN = 10000;
const MAX_ITERATIONS = 20;
/*
The probability of using a fallback nonuniform RNG is bounded by 1 / SAFETY_MARGIN ** MAX_ITERATIONS
assuming the underlying RNG used is free from bias. With these values, this means that there is at
most a 1/10^80 chance of using the fallback, which is basically zero.

Note: SAFETY_MARGIN must be at most 2**20.
*/

function next(bound)
{
	if (bound <= 0 || bound > 2**32 || bound !== Math.floor(bound)) {throw 'invalid bound';}
	for (let it = 0; it <= MAX_ITERATIONS; it++)
	{
		for (let i = 0; i < 53 && entropy_size <= 2**52 && entropy_size < bound*SAFETY_MARGIN; i++)
		{
			entropy += random_bit() * entropy_size;
			entropy_size *= 2;
		}
		let limit = entropy_size - entropy_size%bound; // = floor(entropy_size / bound) * bound
		if (entropy < limit || it === MAX_ITERATIONS)
		{
			let result = entropy % bound;
			entropy = (entropy - result) / bound;
			entropy_size = limit / bound;
			if (entropy === entropy_size)
			{
				// this can happen only if we've exceeded the iteration limit
				entropy = 0;
				entropy_size = 1;
			}
			return result;
		}
		entropy -= limit;
		entropy_size -= limit;
	}
}

return Object.freeze({next, is_crypto: !!this.crypto});
})();

function shuffle(l)
{
	let n = l.length;
	for (let i = 1; i < n; i++)
	{
		let r = rng.next(i + 1);
		if (i !== r)
		{
			[l[i], l[r]] = [l[r], l[i]];
		}
	}
	return l;
}

function permutation_parity(A)
{
	let n = A.length;
	let parity = 0;
	for (let i = 0; i < n-1; i++)
	{
		for (let j = i; j < n; j++)
		{
			if (A[i] > A[j]) parity ^= 1;
		}
	}
	return parity;
}

function random_permutation(n)
{
	let p = [0];
	for (let i = 1; i < n; i++)
	{
		let r = rng.next(i + 1);
		p[i] = p[r];
		p[r] = i;
	}
	return p;
}

function random_even_permutation(n)
{
	let p = random_permutation(n);
	if (permutation_parity(p) === 1) {[p[0], p[1]] = [p[1], p[0]];}
	return p;
}

function generate_state()
{
	let ep = random_permutation(12);
	let cp = random_permutation(8);
	if (permutation_parity(ep) !== permutation_parity(cp))
	{
		[ep[0], ep[1]] = [ep[1], ep[0]];
	}
	let co = Array(8).fill(0);
	for (let i = 0; i < 7; i++)
	{
		co[i] = rng.next(3);
		co[7] += 3 - co[i];
	}
	co[7] %= 3;
	let cube = new Facelets(3);
	for (let i = 0; i < 12; i++)
	{
		cube.setEdge(i, ep[i], 0);
	}
	for (let i = 0; i < 8; i++)
	{
		cube.setCorner(i, cp[i] + 8*co[i]);
	}
	return cube;
}

function analyse_state_ud(cube)
{
	/*
	return value:
	[(int) # bad corners, (int) # bad edges, (bool) is this AR?]
	*/
	let co = [];
	for (let i = 0; i < 8; i++)
	{
		co[i] = cube.getCorner(i) >>> 3;
	}
	let nc = co.filter(x => x !== 0).length;
	let ne = 0;
	for (let i = 4; i < 8; i++)
	{
		let edge = cube.getEdge(i, 0);
		if (edge < 4 || edge >= 8) {ne += 2;}
	}
	return [nc, ne, check_ar(cube)];
}

function check_ar(cube)
{
	/* AR/JZP tests:
	1. even number of bad corners
	2. no white/yellow stickers on RL faces
	3. no E-slice edges in M
	*/
	let co = [];
	for (let i = 0; i < 8; i++)
	{
		co[i] = cube.getCorner(i) >>> 3;
	}
	let nc = co.filter(x => x !== 0).length;
	if (nc % 2 === 1) {return false;}
	const TETRAD = [0, 1, 0, 1, 1, 0, 1, 0];
	for (let i = 0; i < 8; i++)
	{
		if (co[i] !== 0 && co[i] + TETRAD[i] !== 2) {return false;}
	}
	for (let i of [0, 2, 8, 10])
	{
		let edge = cube.getEdge(i, 0);
		if (4 <= edge && edge < 8) {return false;}
	}
	return true;
}

function analyse_state_both(cube)
{
	let cubez = cube.copy();
	cubez.applyOuterBlockMove(4, 3, 1);
	cubez.recolour();
	return [analyse_state_ud(cube), analyse_state_ud(cubez)];
}

// needs min2phase to already be loaded
let min2phase_search = new min2phase.Search();

function find_generating_sequence(cube, padding = 3)
{
	let prefix = '', suffix = '';
	let first_axis_filter, last_axis_filter;
	cube = cube.copy();
	switch (padding)
	{
	case 3:
		cube.applyOuterBlockMove(4, 1, -1); // F'
		cube.applyOuterBlockMove(0, 1, 1); // U
		cube.applyOuterBlockMove(2, 1, 1); // R
		suffix = "R' U' F";
		last_axis_filter = 1;
		break;
	case 1:
		cube.applyOuterBlockMove(5, 1, -1); // B'
		suffix = "B";
		last_axis_filter = 2;
	case 0:
		break;
	}
	let invcube = new Facelets(3);
	for (let i = 0; i < 12; i++)
	{
		let edge = cube.getEdge(i, 0);
		invcube.setEdge(edge, i, 0);
	}
	for (let i = 0; i < 8; i++)
	{
		let corner = cube.getCorner(i);
		invcube.setCorner(corner, i);
	}
	switch (padding)
	{
	case 3:
		invcube.applyOuterBlockMove(2, 1, -1); // R'
		invcube.applyOuterBlockMove(0, 1, -1); // U'
		invcube.applyOuterBlockMove(4, 1, 1); // F
		prefix = "R' U' F";
		first_axis_filter = 2;
		break;
	case 1:
		invcube.applyOuterBlockMove(4, 1, 1); // F
		prefix = "F";
		first_axis_filter = 2;
		break;
	case 0:
		break;
	}
	let seq = prefix + ' ' + min2phase_search.solution(invcube.toKociembaString(), 21, 1e7, 50, 0, first_axis_filter, last_axis_filter) + suffix;
	return seq.replace(/  /g, ' ').trim();
}

function generate_filtered_scramble(filters)
{
	let ar_filter = false;
	let ce_filters = Array(9).fill().map(() => Array(9).fill(false));
	for (let filter_str of filters)
	{
		if (filter_str === 'ar') {ar_filter = true; continue;}
		let nc = +filter_str[0];
		let ne = +filter_str[2];
		ce_filters[nc][ne] = true;
	}
	if (filters.length === 0)
	{
		for (let nc = 0; nc <= 8; nc++)
		{
			for (let ne = 0; ne <= 8; ne += 2)
			{
				ce_filters[nc][ne] = true;
			}
		}
	}
	const MAX_TRIES = 1200;
	let scramble_found = false;
	let cube;
	for (let i = 0; i < MAX_TRIES; i++)
	{
		cube = generate_state();
		let [ud, rl] = analyse_state_both(cube);
		//console.log(ud, rl);
		if (ce_filters[ud[0]][ud[1]] || ce_filters[rl[0]][rl[1]]) {scramble_found = true; break;}
		if (ar_filter && (ud[2] || rl[2])) {scramble_found = true; break;}
	}
	if (scramble_found) {return cube;}
	console.log('Could not get scramble matching given filters! Using fallback generator.');
	let random_filter = filters[rng.next(filters.length)];
	if (random_filter === 'ar') {cube = generate_ar_scramble();}
	else
	{
		let nc = +random_filter[0];
		let ne = +random_filter[2];
		cube = generate_xcxe_scramble(nc, ne);
	}
	if (rng.next(2) === 0)
	{
		// 50% chance of doing z rotation
		cube.applyOuterBlockMove(4, 3, 1);
		cube.recolour();
	}
	return cube;
}

function generate_xcxe_scramble(nc, ne)
{
	if (nc < 0 || nc > 8 || nc == 1 || ne < 0 || ne > 8 || ne % 2 !== 0) {throw 'illegal nc, ne values';}
	let ud_edges = [0, 1, 2, 3, 8, 9, 10, 11];
	let e_edges = [4, 5, 6, 7];
	shuffle(ud_edges);
	shuffle(e_edges);
	let ud_ep = [...Array(8-ne/2).fill(0), ...Array(ne/2).fill(1)];
	let e_ep = [...Array(ne/2).fill(0), ...Array(4-ne/2).fill(1)];
	shuffle(ud_ep);
	shuffle(e_ep);
	let ep = [...ud_ep.slice(0, 4), ...e_ep, ...ud_ep.slice(4, 8)];
	for (let i = 0; i < 12; i++)
	{
		if (ep[i] === 0) {ep[i] = ud_edges.pop();}
		else {ep[i] = e_edges.pop();}
	}
	//console.log(ep);

	let co = Array(8).fill(0);
	if (nc >= 2)
	{
		let count = co.map(x => +(x !== 0)).reduce((x, y) => x+y);
		while (count !== nc)
		{
			co[7] = 0;
			for (let i = 0; i < 7; i++)
			{
				co[i] = rng.next(3);
				co[7] += 3 - co[i];
			}
			co[7] %= 3;
			count = co.map(x => +(x !== 0)).reduce((x, y) => x+y);
		}
	}
	let cp = random_permutation(8);
	if (permutation_parity(ep) !== permutation_parity(cp))
	{
		[cp[0], cp[1]] = [cp[1], cp[0]];
	}

	let cube = new Facelets(3);
	for (let i = 0; i < 12; i++)
	{
		cube.setEdge(i, ep[i], 0);
	}
	for (let i = 0; i < 8; i++)
	{
		cube.setCorner(i, cp[i] + 8*co[i]);
	}
	return cube;
}

function generate_ar_scramble()
{
	let ud_edges = [0, 1, 2, 3, 8, 9, 10, 11];
	let e_edges = [4, 5, 6, 7];
	shuffle(ud_edges);
	shuffle(e_edges);
	let rl_ep = [0, 0, 0, 0, 1, 1, 1, 1];
	shuffle(rl_ep);
	let ep = [0, rl_ep[0], 0, ...rl_ep.slice(1, 6), 0, rl_ep[6], 0, rl_ep[7]];
	for (let i = 0; i < 12; i++)
	{
		if (ep[i] === 0) {ep[i] = ud_edges.pop();}
		else {ep[i] = e_edges.pop();}
	}

	const TETRAD = [0, 1, 0, 1, 1, 0, 1, 0];
	let pseudocp = random_permutation(8);
	let co = [];
	for (let i = 0; i < 8; i++)
	{
		if (TETRAD[i] === TETRAD[pseudocp[i]]) {co[i] = 0;}
		else {co[i] = 1+TETRAD[pseudocp[i]];}
	}
	let cp = random_permutation(8);
	if (permutation_parity(ep) !== permutation_parity(cp))
	{
		[cp[0], cp[1]] = [cp[1], cp[0]];
	}

	let cube = new Facelets(3);
	for (let i = 0; i < 12; i++)
	{
		cube.setEdge(i, ep[i], 0);
	}
	for (let i = 0; i < 8; i++)
	{
		cube.setCorner(i, cp[i] + 8*co[i]);
	}
	return cube;
}
