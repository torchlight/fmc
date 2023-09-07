'use strict';

class Facelets
{

constructor(size)
{
	if ((typeof size) !== 'number' || size < 1 || size != Math.floor(size))
	{
		throw 'size must be a positive integer';
	}
	let size2 = size*size;
	this.size = size;
	this.size2 = size2;
	this.U = new Uint8Array(size2);
	this.D = new Uint8Array(size2);
	this.R = new Uint8Array(size2);
	this.L = new Uint8Array(size2);
	this.F = new Uint8Array(size2);
	this.B = new Uint8Array(size2);
	this.faces = [this.U, this.D, this.R, this.L, this.F, this.B];
	this.reset();
}

reset()
{
	for (let f = 0; f < 6; f++) {this.faces[f].fill(f);}
}

copy()
{
	let facelets = new Facelets(this.size);
	for (let f = 0; f < 6; f++) {
		for (let i = 0; i < this.size2; i++) {
			facelets.faces[f][i] = this.faces[f][i];
		}
	}
	return facelets;
}

rebuildFaceArray()
{
	let faces = this.faces;
	faces[0] = this.U;
	faces[1] = this.D;
	faces[2] = this.R;
	faces[3] = this.L;
	faces[4] = this.F;
	faces[5] = this.B;
}

recolour()
{
	// for odd cubes, recolour so that the U centre has the U colour, etc.
	// TODO: do something sensible for even cubes
	if (this.size % 2 === 1) {
		let midpoint = this.size2 >>> 1;
		let colourmap = Array(6);
		for (let f = 0; f < 6; f++) {
			colourmap[this.faces[f][midpoint]] = f;
		}
		for (let f = 0; f < 6; f++) {
			for (let i = 0; i < this.size2; i++) {
				this.faces[f][i] = colourmap[this.faces[f][i]];
			}
		}
	}
}

applySliceMove(side, layer, amount) {
	// Apply a single slice move.
	// `layer` is indexed starting from 0 for the outermost layer
	// `amount` is 1 for clockwise, 2 for half turn, 3 for anticlockwise
	let size = this.size;
	let size2 = this.size2;
	let faces = this.faces;
	amount = amount & 3;
	if (amount === 0) {return;}
	let axis = side >>> 1;
	if (side % 2 === 1) {
		side -= 1;
		layer = (size - 1) - layer;
		amount = (-amount) & 3;
	}
	let f0 = -1, f1 = -1, f2, f3;
	let i0 = -1, i1 = -1, i2 = -1, i3 = -1;
	let p0 = -1, p1 = -1, p2 = -1, p3 = -1;
	switch (axis) {
	case 0:
		// U-D
		f0 = 2; f1 = 4;
		i0 = i1 = i2 = i3 = size * layer;
		p0 = p1 = p2 = p3 = 1;
		break;
	case 1:
		// R-L
		f0 = 0; f1 = 5;
		i0 = i2 = i3 = size-1-layer; i1 = size * (size-1) + layer;
		p0 = p2 = p3 = size; p1 = -size;
		break;
	case 2:
		// F-B
		f0 = 0; f1 = 2;
		i0 = size * (size-1-layer); i1 = layer; i2 = size*layer + size-1; i3 = size2-1-layer;
		p0 = 1; p1 = size; p2 = -1; p3 = -size;
		break;
	}
	f2 = f0 ^ 1; f3 = f1 ^ 1;
	switch (amount)
	{
	case 1:
		for (let j = 0; j < size; j++) {
			let t = faces[f0][i0];
			faces[f0][i0] = faces[f3][i3];
			faces[f3][i3] = faces[f2][i2];
			faces[f2][i2] = faces[f1][i1];
			faces[f1][i1] = t;
			i0 += p0;
			i1 += p1;
			i2 += p2;
			i3 += p3;
		}
		break;
	case 2:
		for (let j = 0; j < size; j++) {
			let t = faces[f0][i0];
			faces[f0][i0] = faces[f2][i2];
			faces[f2][i2] = t;
			t = faces[f1][i1];
			faces[f1][i1] = faces[f3][i3];
			faces[f3][i3] = t;
			i0 += p0;
			i1 += p1;
			i2 += p2;
			i3 += p3;
		}
		break;
	case 3:
		for (let j = 0; j < size; j++) {
			let t = faces[f0][i0];
			faces[f0][i0] = faces[f1][i1];
			faces[f1][i1] = faces[f2][i2];
			faces[f2][i2] = faces[f3][i3];
			faces[f3][i3] = t;
			i0 += p0;
			i1 += p1;
			i2 += p2;
			i3 += p3;
		}
		break;
	}

	if (layer === 0 || layer === size-1) {
		let f = 2*axis, a = amount;
		if (layer === size-1) {
			f += 1;
			a = (-a) & 3;
		}
		let face = faces[f];
		let m = size >>> 1, M = size-m; // m = floor(size/2), M = ceil(size/2)
		switch (a) {
		case 1:
			for (let i = 0; i < m; i++) {
				for (let j = 0; j < M; j++) {
					let w = i*size + j;
					let x = (size-1-j)*size + i;
					let y = size2-1 - w;
					let z = size2-1 - x;
					let t = face[w];
					face[w] = face[x];
					face[x] = face[y];
					face[y] = face[z];
					face[z] = t;
				}
			}
			break;
		case 2:
			let halfsize2 = size2 >>> 1;
			for (let i = 0; i < halfsize2; i++) {
				let t = face[i];
				face[i] = face[size2-1 - i];
				face[size2-1 - i] = t;
			}
			break;
		case 3:
			for (let i = 0; i < m; i++) {
				for (let j = 0; j < M; j++) {
					let w = i*size + j;
					let x = (size-1-j)*size + i;
					let y = size2-1 - w;
					let z = size2-1 - x;
					let t = face[w];
					face[w] = face[z];
					face[z] = face[y];
					face[y] = face[x];
					face[x] = t;
				}
			}
			break;
		}
	}
}

applyOuterBlockMove(side, numLayers, amount) {
	if ((amount & 3) === 0) return;
	for (let i = 0; i < numLayers; i++) {
		this.applySliceMove(side, i, amount);
	}
}

print(labels = [".", "#", "r", "l", "f", "b"]) {
	let size = this.size;

	// print L, F, R, then B in the middle row
	let order = [3, 4, 2, 5];

	let padding = ''.padStart(2*size+1, ' ');

	for (let i = 0; i < size; i++) {
		let row = padding;
		for (let j = 0; j < size; j++) {
			row += labels[this.U[size*i+j]];
			if (j !== size-1) {row += ' ';}
		}
		console.log(row);
	}
	console.log('');
	for (let i = 0; i < size; i++) {
		let row = '';
		for (let j = 0; j < 4; j++) {
			for (let k = 0; k < size; k++) {
				row += labels[this.faces[order[j]][size*i+k]];
				if (k !== size-1 || j !== 3) {row += ' ';}
			}
			if (j !== 3) {row += ' ';}
		}
		console.log(row);
	}
	console.log('');
	for (let i = 0; i < size; i++) {
		let row = padding;
		for (let j = 0; j < size; j++) {
			row += labels[this.D[size*i+j]];
			if (j !== size-1) {row += ' ';}
		}
		console.log(row);
	}
}

static fromKociembaString(cubeString) {
	cubeString = cubeString.toLowerCase();
	let size = Math.sqrt(cubeString.length / 6);
	let size2 = size * size;
	let out = new Facelets(size);
	let faces = [out.U, out.R, out.F, out.D, out.L, out.B];
	for (let f = 0; f < 6; f++) {
		let face = faces[f];
		for (let i = 0; i < size2; i++) {
			let colour = -1;
			switch (cubeString[f*size2 + i]) {
			// U / white
			case 'u': case 'w':
				colour = 0; break;
			// D / yellow
			case 'd': case 'y':
				colour = 1; break;
			// R / red
			case 'r':
				colour = 2; break;
			// L / orange
			case 'l': case 'o':
				colour = 3; break;
			// F / green
			case 'f': case 'g':
				colour = 4; break;
			// B / blue
			case 'b':
				colour = 5; break;
			}
			face[i] = colour;
		}
	}
	return out;
}

toKociembaString() {
	const faces = [this.U, this.R, this.F, this.D, this.L, this.B];
	return faces.map(face => [...face].map(x => 'UDRLFB'[x]).join('')).join('');
}

identifyCornerFromColours(a, b, c) {
	// identify a corner given the three colours on it, in clockwise order
	let orientation = 0;
	if (b < 2) {
		orientation = 2;
		let t = a;
		a = b;
		b = c;
		c = t;
	}
	else if (c < 2) {
		orientation = 1;
		let t = c;
		c = b;
		b = a;
		a = t;
	}
	/*
	 * a:     	0u	1d	0u	1d	0u	1d	0u	1d
	 * b:    	2r	2r	3l	3l	4f	4f	5b	5b
	 * c:     	4f	5b	5b	4f	3l	2r	2r	3l
	 * a+2b-4:	0	1	2	3	4	5	6	7
	 * corner:	3	6	1	4	0	7	2	5
	 */
	let shift = 3*(a + 2*b - 4);
	let pieceIndex = (0o52704163 >> shift) & 7;
	return pieceIndex + 8 * orientation;
}

identifyEdgeFromColours(a, b) {
	// identify an edge (midge/wing) given the two colours on it
	let orientation = 0;
	if (b < 2 || (a >> 1) == 1) {
		orientation = 1;
		let t = a;
		a = b;
		b = t;
	}
	/*
	 * a:     	0	0	0	0	1	1	1	1
	 * b:     	2	3	4	5	2	3	4	5
	 * 4a+b-2:	0	1	2	3	4	5	6	7
	 * edge:  	3	1	0	2	11	9	8	10
	 *
	 * a:      	4	4	5	5
	 * b:      	2	3	2	3
	 * 2a+b-10:	0	1	2	3
	 * edge:	7	4	6	5
	 */
	let pieceIndex;
	if (a < 2) {pieceIndex = ((0o2013 >> (3*(b - 2))) & 7) + 8 * a;}
	else {pieceIndex = ((0o5647 >> (3*(2*a + b - 10))) & 7);}

	return pieceIndex + 12*orientation;
}

getFaceOfCornerFacelet(cornerIndex) {
	switch (cornerIndex) {
	case 0:
	case 1:
	case 2:
	case 3:
		return 0;
	case 4:
	case 5:
	case 6:
	case 7:
		return 1;

	case 8:
		return 4;
	case 9:
		return 3;
	case 10:
		return 5;
	case 11:
		return 2;
	case 12:
		return 3;
	case 13:
		return 5;
	case 14:
		return 2;
	case 15:
		return 4;

	case 16:
		return 3;
	case 17:
		return 5;
	case 18:
		return 2;
	case 19:
		return 4;
	case 20:
		return 4;
	case 21:
		return 3;
	case 22:
		return 5;
	case 23:
		return 2;
	}
	return -1;
}

getIndexWithinFaceOfCornerFacelet(cornerIndex) {
	const topLeft = 0,
	      topRight = this.size-1,
	      bottomLeft = this.size2-this.size,
	      bottomRight = this.size2-1;
	switch (cornerIndex) {
	case 0:
		return bottomLeft;
	case 1:
		return topLeft;
	case 2:
		return topRight;
	case 3:
		return bottomRight;
	case 4:
		return topLeft;
	case 5:
		return bottomLeft;
	case 6:
		return bottomRight;
	case 7:
		return topRight;

	case 8:
	case 9:
	case 10:
	case 11:
		return topLeft;
	case 12:
	case 13:
	case 14:
	case 15:
		return bottomRight;

	case 16:
	case 17:
	case 18:
	case 19:
		return topRight;
	case 20:
	case 21:
	case 22:
	case 23:
		return bottomLeft;
	}
	return -1;
}

getFaceOfEdgeFacelet(edgeIndex) {
	switch (edgeIndex) {
	case 0:
	case 1:
	case 2:
	case 3:
		return 0;
	case 4:
		return 4;
	case 5:
		return 5;
	case 6:
		return 5;
	case 7:
		return 4;
	case 8:
	case 9:
	case 10:
	case 11:
		return 1;

	case 12:
		return 4;
	case 13:
		return 3;
	case 14:
		return 5;
	case 15:
		return 2;
	case 16:
		return 3;
	case 17:
		return 3;
	case 18:
		return 2;
	case 19:
		return 2;
	case 20:
		return 4;
	case 21:
		return 3;
	case 22:
		return 5;
	case 23:
		return 2;
	}
	return -1;
}

getIndexWithinFaceOfEdgeFacelet(edgeIndex, orbit) {
	// orbit = 0 => midges (provided that size is odd; otherwise undefined)
	// orbit > 0 => wings (primary)
	// orbit < 0 => wings (secondary)
	// note: the secondary facelets are the ones that are lettered in Speffz
	const size = this.size;
	const size2 = this.size2;
	if (orbit < 0 && size % 2 == 0) orbit++;
	const half = (size-1) >>> 1;
	const top = half+orbit, right = (half+orbit+1)*size-1;
	const bottom = size2-1-top, left = size2-1-right;
	switch (edgeIndex) {
	case 0:
		return bottom;
	case 1:
		return left;
	case 2:
		return top;
	case 3:
		return right;
	case 4:
		return left;
	case 5:
		return right;
	case 6:
		return left;
	case 7:
		return right;
	case 8:
		return top;
	case 9:
		return left;
	case 10:
		return bottom;
	case 11:
		return right;

	case 12:
	case 13:
	case 14:
	case 15:
		return top;
	case 16:
		return right;
	case 17:
		return left;
	case 18:
		return right;
	case 19:
		return left;
	case 20:
	case 21:
	case 22:
	case 23:
		return bottom;
	}
	return -1;
}

getCorner(cornerLocation) {
	let f0 = this.getFaceOfCornerFacelet(cornerLocation);
	let f1 = this.getFaceOfCornerFacelet((cornerLocation + 8) % 24);
	let f2 = this.getFaceOfCornerFacelet((cornerLocation + 16) % 24);
	let i0 = this.getIndexWithinFaceOfCornerFacelet(cornerLocation);
	let i1 = this.getIndexWithinFaceOfCornerFacelet((cornerLocation + 8) % 24);
	let i2 = this.getIndexWithinFaceOfCornerFacelet((cornerLocation + 16) % 24);
	let a = this.faces[f0][i0], b = this.faces[f1][i1], c = this.faces[f2][i2];
	return this.identifyCornerFromColours(a, b, c);
}

getEdge(edgeLocation, orbit) {
	let f0 = this.getFaceOfEdgeFacelet(edgeLocation);
	let f1 = this.getFaceOfEdgeFacelet((edgeLocation + 12) % 24);
	let i0 = this.getIndexWithinFaceOfEdgeFacelet(edgeLocation, orbit);
	let i1 = this.getIndexWithinFaceOfEdgeFacelet((edgeLocation + 12) % 24, -orbit);
	let a = this.faces[f0][i0], b = this.faces[f1][i1];
	return this.identifyEdgeFromColours(a, b);
}

setCorner(cornerLocation, cornerPiece) {
	let f0 = this.getFaceOfCornerFacelet(cornerLocation);
	let f1 = this.getFaceOfCornerFacelet((cornerLocation + 8) % 24);
	let f2 = this.getFaceOfCornerFacelet((cornerLocation + 16) % 24);
	let i0 = this.getIndexWithinFaceOfCornerFacelet(cornerLocation);
	let i1 = this.getIndexWithinFaceOfCornerFacelet((cornerLocation + 8) % 24);
	let i2 = this.getIndexWithinFaceOfCornerFacelet((cornerLocation + 16) % 24);
	let a = this.getFaceOfCornerFacelet(cornerPiece);
	let b = this.getFaceOfCornerFacelet((cornerPiece + 8) % 24);
	let c = this.getFaceOfCornerFacelet((cornerPiece + 16) % 24);
	this.faces[f0][i0] = a;
	this.faces[f1][i1] = b;
	this.faces[f2][i2] = c;
}

setEdge(edgeLocation, edgePiece, orbit) {
	let f0 = this.getFaceOfEdgeFacelet(edgeLocation);
	let f1 = this.getFaceOfEdgeFacelet((edgeLocation + 12) % 24);
	let i0 = this.getIndexWithinFaceOfEdgeFacelet(edgeLocation, orbit);
	let i1 = this.getIndexWithinFaceOfEdgeFacelet((edgeLocation + 12) % 24, -orbit);
	let a = this.getFaceOfEdgeFacelet(edgePiece);
	let b = this.getFaceOfEdgeFacelet((edgePiece + 12) % 24);
	this.faces[f0][i0] = a;
	this.faces[f1][i1] = b;
}

}