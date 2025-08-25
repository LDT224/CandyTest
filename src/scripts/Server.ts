

/**
 * Mocked data for spin data
 * {
 *   matrix: string[],
 *   combine: string[], // format: [symbol];[pos1, pos2, ...];[score]
 * }
 */
const spinDataMockupDemo = [
    { "matrix": ["3", "3", "3", "3", "5", "1", "5", "2", "5", "5", "1", "8", "2", "2", "5", "8", "2", "2", "3", "2", "1", "3", "5", "8", "4"], "combine": ["3;0,1,2,3;2.00", "5;4,9,8,14;7.50", "2;7,12,13,17,16;2.00"] },
    { "matrix": ["5", "7", "6", "1", "5", "1", "2", "1", "1", "5", "4", "2", "5", "1", "8", "7", "2", "8", "3", "2", "1", "3", "5", "8", "4"], "combine": ["1;3,8,7,13;1.00"] },
    { "matrix": ["6", "5", "7", "6", "5", "3", "1", "1", "2", "5", "K", "4", "2", "5", "8", "7", "2", "8", "3", "2", "1", "3", "5", "8", "4"] },
    { "matrix": ["6", "5", "7", "6", "5", "6", "2", "6", "K", "5", "5", "8", "K", "5", "8", "1", "8", "2", "7", "8", "2", "8", "8", "5", "8"], "combine": ["6;3,8,7,12;10.00", "5;4,9,8,13,12;12.50", "8;11,12,16,21,22;10.00"] },
    { "matrix": ["1", "K", "6", "5", "7", "K", "6", "1", "6", "2", "8", "6", "2", "5", "8", "4", "1", "2", "7", "8", "8", "K", "2", "5", "8"], "combine": ["6;2,1,6,5,11;15.00", "2;12,17,22,21;1.50"] },
    { "matrix": ["8", "3", "1", "5", "7", "3", "2", "1", "6", "2", "5", "1", "8", "5", "8", "7", "4", "1", "7", "8", "2", "6", "8", "5", "8"] },
    { "matrix": ["8", "3", "1", "5", "7", "3", "K", "1", "K", "2", "5", "1", "8", "5", "8", "7", "K", "1", "K", "8", "2", "6", "8", "5", "8"], "combine": ["8;14,19,18,24;5.00", "5;3,8,13,18,23;12.50", "1;2,7,6,8,11,16,17,18;3.00"] },
    { "matrix": ["1", "8", "8", "3", "7", "5", "2", "1", "3", "2", "2", "6", "4", "5", "8", "4", "3", "4", "5", "7", "3", "1", "2", "6", "8"] },
    { "matrix": ["6", "8", "6", "3", "6", "5", "6", "1", "6", "2", "6", "6", "6", "5", "6", "4", "6", "4", "6", "7", "6", "1", "6", "6", "6"], "combine": ["6;6,11,10,12,16;15.00", "6;18,23,22,24;10.00"] },
    { "matrix": ["6", "8", "6", "3", "6", "2", "5", "1", "6", "2", "8", "8", "4", "5", "6", "2", "6", "4", "4", "7", "7", "8", "4", "6", "1"], "combine": ["4;12,17,18,22;2.50"] },
    { "matrix": ["6", "8", "6", "3", "6", "2", "5", "1", "6", "2", "3", "8", "8", "5", "6", "8", "7", "2", "6", "7", "1", "7", "8", "6", "1"] },
    { "matrix": ["6", "8", "6", "8", "6", "5", "5", "8", "6", "5", "8", "8", "8", "5", "6", "8", "7", "5", "6", "7", "8", "7", "8", "6", "8"], "combine": ["8;7,12,11,10,15,20;15.00"] },
    { "matrix": ["6", "8", "6", "8", "6", "5", "5", "5", "6", "5", "8", "8", "8", "5", "6", "8", "7", "5", "6", "7", "8", "7", "8", "6", "8"], "combine": ["8;10,11,15,12,20;10.00"] },
    { "matrix": ["6", "8", "6", "8", "6", "5", "5", "5", "6", "5", "5", "6", "7", "5", "6", "8", "7", "5", "6", "7", "8", "7", "8", "6", "8"], "combine": ["5;5,6,10,7;7.50"] },
    { "matrix": ["6", "8", "6", "8", "6", "5", "8", "5", "6", "5", "8", "6", "7", "5", "6", "8", "7", "5", "6", "7", "8", "7", "8", "6", "8"] },

];

class SpinManager {
    private rows = 5;
    private cols = 5;
    private symbols = ["1", "2", "3", "4", "5", "6", "7", "8", "K"];

    private randomSymbol(): string {
        return this.symbols[Math.floor(Math.random() * this.symbols.length)];
    }

    private generateMatrix(): string[] {
        return Array.from({ length: this.rows * this.cols }, () => this.randomSymbol());
    }

    private getNeighbours(i: number): number[] {
        const nb: number[] = [];
        const r = i % this.rows;            
        const c = Math.floor(i / this.rows);

        // up/down
        if (r > 0) nb.push(i - 1);                   
        if (r < this.rows - 1) nb.push(i + 1);       
        // left/right
        if (c > 0) nb.push(i - this.rows);           
        if (c < this.cols - 1) nb.push(i + this.rows); 
        return nb;
    }

    private findCluster(matrix: string[], start: number, visited: Set<number>): number[] {
        const seed = matrix[start];
        if (seed === "K") return []; 

        const stack = [start];
        const cluster: number[] = [];

        while (stack.length) {
            const idx = stack.pop()!;
            if (visited.has(idx)) continue;

            const val = matrix[idx];

            if (val !== seed && val !== "K") continue;

            visited.add(idx);
            cluster.push(idx);

            for (const nb of this.getNeighbours(idx)) {
                if (!visited.has(nb)) stack.push(nb);
            }
        }
        return cluster;
    }

    private findCombines(matrix: string[]): string[] {
        const visited = new Set<number>();
        const combines: string[] = [];

        for (let i = 0; i < matrix.length; i++) {
            if (visited.has(i)) continue;
            if (matrix[i] === "K") continue; 

            const cluster = this.findCluster(matrix, i, visited);
            if (cluster.length >= 4) {
                const symbol = matrix[i]; 
                const indexes = cluster.sort((a, b) => a - b).join(",");
                const multiplier = (cluster.length * 0.5).toFixed(2); 
                combines.push(`${symbol};${indexes};${multiplier}`);
            }
        }
        return combines;
    }

    private dropMatrix(matrix: string[], clusters: string[]): string[] {
        const arr = [...matrix];
        const toRemove = new Set<number>();

        for (const c of clusters) {
            const parts = c.split(";");
            if (parts.length >= 2) {
                for (const s of parts[1].split(",")) toRemove.add(Number(s));
            }
        }

        for (const idx of toRemove) arr[idx] = "";

        for (let c = 0; c < this.cols; c++) {
            const base = c * this.rows;

            const keep: string[] = [];
            for (let r = 0; r < this.rows; r++) {
                const i = base + r;
                if (arr[i] !== "") keep.push(arr[i]);
            }

            let writeR = this.rows - 1;
            for (let k = keep.length - 1; k >= 0; k--) {
                arr[base + writeR] = keep[k];
                writeR--;
            }

            for (let r = writeR; r >= 0; r--) {
                arr[base + r] = this.randomSymbol();
            }
        }

        return arr;
    }

    public generateSpinSequence() {
        let matrix = this.generateMatrix();
        const sequence: { matrix: string[], combine?: string[] }[] = [];

        while (true) {
            const combines = this.findCombines(matrix);
            if (combines.length === 0) {
                sequence.push({ matrix });
                break;
            } else {
                sequence.push({ matrix: [...matrix], combine: combines });
                matrix = this.dropMatrix(matrix, combines);
            }
        }

        return sequence;
    }
}

/**
 * Fake Server
 */
export default class Server {
    private _mockDataIndex = 0;
    private _dataRespondCallbacks: Function[] = [];
    private _spinManager = new SpinManager();

    public useMockData: boolean = false;

    private _currentSequence: any[] = [];
    private _sequenceIndex: number = 0;

    public registerDataRespondEvent(callback: Function): void {
        this._dataRespondCallbacks.push(callback);
    }

    public requestSpinData(): void {
        const delay = this._randomRange(100, 1500) + ((Math.random() > 0.8) ? 2000 : 0);

        window.setTimeout(() => {
            let data;

            if (this.useMockData) {
                data = spinDataMockupDemo[this._mockDataIndex];
                this._mockDataIndex = (this._mockDataIndex + 1) % spinDataMockupDemo.length;
            } else {
                if (this._sequenceIndex >= this._currentSequence.length) {
                    this._currentSequence = this._spinManager.generateSpinSequence();
                    this._sequenceIndex = 0;
                }

                data = this._currentSequence[this._sequenceIndex];
                this._sequenceIndex++;
            }

            this._dataRespondCallbacks.forEach((callback) => {
                callback(data);
            });
        }, delay);
    }

    private _randomRange(min: number, max: number, int: boolean = false) {
        const delta = max - min;
        const rnd = Math.random();
        let result = min + rnd * delta;
        if (int) result = Math.round(result);
        return result;
    }
}

