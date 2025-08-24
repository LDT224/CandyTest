import * as PIXI from 'pixi.js';
import { MainApp } from './app';
import Server from './Server';

const symbolTextures: Record<string, PIXI.Texture> = {};
const symbolTypes = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'K'];

enum GameState {
    Idle,
    Spinning,
    Resolving,
    Falling
}

interface Reel {
    container: PIXI.Container;
    symbols: PIXI.Sprite[];
    position: number;
    speed: number;
    spinning: boolean;
    stopping: boolean;
    result?: string[];
    startTime: number;
    minDuration: number;
    resultReady: boolean;
    acceleration: number;
    deceleration: number;
    maxSpeed: number;
    fallingNewSprites: PIXI.Sprite[];
}

export class GameScene extends PIXI.Container {
    static readonly NUMBER_OF_REELS = 5;
    static readonly NUMBER_OF_ROWS = 5;
    static readonly SYMBOL_WIDTH = 110;
    static readonly SYMBOL_HEIGHT = 100;

    private _server: Server;
    private _isInitialized = false;
    private _logoSprite!: PIXI.Sprite;
    private _spinText!: PIXI.Text;
    private _gameState: GameState = GameState.Idle;
    private _boardContainer!: PIXI.Container;
    private _boardSprites: PIXI.Sprite[] = [];
    private _currentMatrix: string[] = [];
    private _currentCombine: string[] = [];
    private _currentNewMatrix: string[] = [];
    private _reels: Reel[] = [];
    private _isSpinning = true;
    private _winningPositions: Set<number> = new Set();

    constructor(server: Server) {
        super();

        this._server = server;
        this._server.registerDataRespondEvent(this._onSpinDataResponded.bind(this));
        MainApp.inst.app.ticker.add(this.onUpdate, this);

        MainApp.inst.app.loader
            .add('logo', 'images/logo.png')
            .add('symbol_0', 'images/symbol_0.png')
            .add('symbol_1', 'images/symbol_1.png')
            .add('symbol_2', 'images/symbol_2.png')
            .add('symbol_3', 'images/symbol_3.png')
            .add('symbol_4', 'images/symbol_4.png')
            .add('symbol_5', 'images/symbol_5.png')
            .add('symbol_6', 'images/symbol_6.png')
            .add('symbol_7', 'images/symbol_7.png')
            .add('symbol_8', 'images/symbol_8.png')
            .add('symbol_9', 'images/symbol_9.png')
            .add('symbol_K', 'images/symbol_K.png')
            .add('symbol_0_blur', 'images/symbol_0_blur.png')
            .add('symbol_1_blur', 'images/symbol_1_blur.png')
            .add('symbol_2_blur', 'images/symbol_2_blur.png')
            .add('symbol_3_blur', 'images/symbol_3_blur.png')
            .add('symbol_4_blur', 'images/symbol_4_blur.png')
            .add('symbol_5_blur', 'images/symbol_5_blur.png')
            .add('symbol_6_blur', 'images/symbol_6_blur.png')
            .add('symbol_7_blur', 'images/symbol_7_blur.png')
            .add('symbol_8_blur', 'images/symbol_8_blur.png')
            .add('symbol_9_blur', 'images/symbol_9_blur.png')
            .add('symbol_K_blur', 'images/symbol_K_blur.png')
            .load(this._onAssetsLoaded.bind(this));
    }

    public init(): void {
        this.addChild(this._logoSprite);
        this._logoSprite.position.set(760 / 2, 100);
        this._logoSprite.anchor.set(0.5);
        this._logoSprite.scale.set(0.5);

        const style = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 36,
            fontWeight: 'bold',
            fill: ['#ffffff', '#00ff99'],
            stroke: '#4a1850',
            strokeThickness: 5,
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 4,
            dropShadowAngle: Math.PI / 6,
            dropShadowDistance: 6,
        });

        this._spinText = new PIXI.Text('Start Spin', style);
        this._spinText.x = 800 / 2 - this._spinText.width / 2;
        this._spinText.y = MainApp.inst.app.screen.height - 200;
        this.addChild(this._spinText);

        this._spinText.interactive = true;
        this._spinText.buttonMode = true;
        this._spinText.addListener('pointerdown', this._startSpin.bind(this));

        this._boardContainer = this.addChild(new PIXI.Container());
        this._boardContainer.position.set(800 / 2, 960 / 2);

        const boardWidth = GameScene.SYMBOL_WIDTH * GameScene.NUMBER_OF_REELS;
        const boardHeight = GameScene.SYMBOL_HEIGHT * GameScene.NUMBER_OF_ROWS;
        const mask = new PIXI.Graphics();
        mask.beginFill(0xffffff);
        mask.drawRect(-boardWidth / 2, -boardHeight / 2, boardWidth, boardHeight);
        mask.endFill();
        this._boardContainer.addChild(mask);
        this._boardContainer.mask = mask;

        const defaultBoard = [
            'K', '3', '7', '6', '8',
            '4', '7', '6', '8', '5',
            '7', '6', '8', '5', '7',
            '6', '8', '5', '7', '2',
            '8', '5', '7', '1', 'K'
        ];

        for (let i = 0; i < GameScene.NUMBER_OF_REELS; i++) {
            const reelContainer = new PIXI.Container();
            reelContainer.x = i * GameScene.SYMBOL_WIDTH - boardWidth / 2 + GameScene.SYMBOL_WIDTH / 2;
            this._boardContainer.addChild(reelContainer);

            const reel: Reel = {
                container: reelContainer,
                symbols: [],
                position: 0,
                speed: 0,
                spinning: false,
                stopping: false,
                result: undefined,
                startTime: 0,
                minDuration: 2000,
                resultReady: false,
                acceleration: 0.1,
                deceleration: 0.5,
                maxSpeed: 20,
                fallingNewSprites: []
            };

            for (let j = -1; j <= GameScene.NUMBER_OF_ROWS; j++) {
                const idx = i * GameScene.NUMBER_OF_ROWS + (j < 0 ? GameScene.NUMBER_OF_ROWS - 1 : j % GameScene.NUMBER_OF_ROWS);
                const symbol = defaultBoard[idx];
                const sprite = new PIXI.Sprite(symbolTextures[symbol]);
                sprite.anchor.set(0.5);
                sprite.x = 0;
                sprite.y = j * GameScene.SYMBOL_HEIGHT - boardHeight / 2 + GameScene.SYMBOL_HEIGHT / 2;
                reelContainer.addChild(sprite);
                reel.symbols.push(sprite);
                this._boardSprites.push(sprite);
            }

            this._reels.push(reel);
        }

        this._isInitialized = true;
    }

    private _startSpin(): void {
        if (this._gameState !== GameState.Idle) return;
        this._gameState = GameState.Spinning;
        this._isSpinning = true;

        const now = performance.now();
        this._reels.forEach((reel, i) => {
            reel.startTime = now + i * 300;
            reel.speed = 0;
            reel.spinning = true;
            reel.stopping = false;
            reel.resultReady = false;
            reel.result = undefined;
            reel.position = 0;
        });

        this._server.requestSpinData();
    }

    public onUpdate(delta: number) {
        if (!this._isInitialized) return;
        const now = performance.now();

        this._spinText.alpha = this._gameState === GameState.Idle ? 1 : 0.5;
        
        for (const reel of this._reels) {
            if (!reel.spinning) continue;
            if (now < reel.startTime) continue;

            if (reel.speed === 0) {
                reel.symbols.forEach(s => {
                    const rand = symbolTypes[Math.floor(Math.random() * symbolTypes.length)];
                    s.texture = symbolTextures[`${rand}_blur`] || symbolTextures[rand];
                });
            }

            if (!reel.stopping && reel.speed < reel.maxSpeed) {
                reel.speed = Math.min(reel.maxSpeed, reel.speed + reel.acceleration * delta);
            }

            const elapsed = now - reel.startTime;
            if (elapsed >= reel.minDuration && reel.resultReady && !reel.stopping) {
                reel.stopping = true;
            }

            if (reel.stopping && reel.speed > 0) {
                reel.speed = Math.max(0, reel.speed - reel.deceleration * delta);
                if (reel.speed <= 0.1) {
                    reel.speed = 0;
                    this._stopReelWithResult(reel);
                    continue;
                }
            }

            reel.position += reel.speed * delta;
            reel.position %= GameScene.NUMBER_OF_ROWS;

            for (let j = 0; j < reel.symbols.length; j++) {
                const s = reel.symbols[j];
                const prevY = s.y;
                s.y = ((j + reel.position) % (GameScene.NUMBER_OF_ROWS + 1)) * GameScene.SYMBOL_HEIGHT -
                    (GameScene.SYMBOL_HEIGHT * GameScene.NUMBER_OF_ROWS) / 2 + GameScene.SYMBOL_HEIGHT / 2;
                if (s.y < -GameScene.SYMBOL_HEIGHT && prevY > 0 && !reel.stopping) {
                    const rand = symbolTypes[Math.floor(Math.random() * symbolTypes.length)];
                    s.texture = symbolTextures[`${rand}_blur`] || symbolTextures[rand];
                }
            }
        }

        // Handle falling animation
        if (this._gameState === GameState.Falling) {
            let allDone = true;
            for (const reel of this._reels) {
                let reelDone = true;
                const allSymbols = [...reel.symbols, ...reel.fallingNewSprites];
                allSymbols.forEach(s => {
                    if (s['targetY'] !== undefined) {
                        const dir = s['targetY'] - s.y > 0 ? 1 : -1;
                        s.y += dir * 20 * delta; // Falling speed 20
                        if (dir > 0 ? s.y >= s['targetY'] : s.y <= s['targetY']) {
                            s.y = s['targetY'];
                            s['targetY'] = undefined;
                        } else {
                            reelDone = false;
                        }
                    }
                });
                if (!reelDone) allDone = false;
            }
            if (allDone) {
                this._finishFalling();
            }
        }
    }

    private _stopReelWithResult(reel: Reel) {
        if (!reel.result) return;

        reel.position = Math.round(reel.position) % GameScene.NUMBER_OF_ROWS;

        for (let j = 0; j < reel.symbols.length; j++) {
            const symbolIndex = j % GameScene.NUMBER_OF_ROWS;
            const texture = symbolTextures[reel.result[symbolIndex]];
            reel.symbols[j].texture = texture;
            reel.symbols[j].y = j * GameScene.SYMBOL_HEIGHT -
                (GameScene.SYMBOL_HEIGHT * GameScene.NUMBER_OF_ROWS) / 2 + GameScene.SYMBOL_HEIGHT / 2;
        }
        reel.spinning = false;

        if (this._reels.every(r => !r.spinning)) {
            this._gameState = GameState.Resolving;
            console.log("All reels stopped. Ready to resolve combine.");
            this._processCombine(this._currentCombine);
        }
    }

    private _onSpinDataResponded(data: any): void {
        console.log(">>> received:", data.matrix, data.combine);
        if (this._isSpinning) {
            this._currentMatrix = data.matrix;
            this._currentCombine = data.combine || [];
            for (let i = 0; i < this._reels.length; i++) {
                const col = data.matrix.slice(i * GameScene.NUMBER_OF_ROWS, (i + 1) * GameScene.NUMBER_OF_ROWS);
                this._reels[i].result = col;
                this._reels[i].resultReady = true;
            }
        } else {
            this._currentNewMatrix = data.matrix;
            this._currentCombine = data.combine || [];
            this._startFalling();
        }
    }

    private _processCombine(combine: string[]) {
        setTimeout(() => {
            this._winningPositions.clear();
            if (!combine || combine.length === 0) {
                this._gameState = GameState.Idle;
                console.log("No combine found. Returning to Idle state.");
                return;
            }
            combine.forEach(entry => {
                const [sym, posStr, score] = entry.split(";");
                const indexes = posStr.split(",").map(n => parseInt(n));
                indexes.forEach(idx => {
                    this._winningPositions.add(idx);
                    const reel = Math.floor(idx / GameScene.NUMBER_OF_ROWS);
                    const row = idx % GameScene.NUMBER_OF_ROWS;
                    const sprite = this._reels[reel].symbols[row];
                    sprite.alpha = 0.5;
                });
            });

            setTimeout(() => {
                this._winningPositions.forEach(idx => {
                    const reel = Math.floor(idx / GameScene.NUMBER_OF_ROWS);
                    const row = idx % GameScene.NUMBER_OF_ROWS;
                    const sprite = this._reels[reel].symbols[row];
                    sprite.visible = false;
                });
                this._isSpinning = false;
                this._server.requestSpinData();
            }, 500);
        }, 500);
    }

    private _startFalling(): void {
        const boardHeight = GameScene.SYMBOL_HEIGHT * GameScene.NUMBER_OF_ROWS;
        const fallFromAbove = 400;
        for (let i = 0; i < this._reels.length; i++) {
            const reel = this._reels[i];
            reel.fallingNewSprites = [];
            let gapsBelow = 0;
            for (let row = GameScene.NUMBER_OF_ROWS - 1; row >= 0; row--) {
                const j = row;
                const s = reel.symbols[j];
                if (this._winningPositions.has(i * GameScene.NUMBER_OF_ROWS + row)) {
                    gapsBelow++;
                } else {
                    s['targetY'] = s.y + gapsBelow * GameScene.SYMBOL_HEIGHT;
                }
            }
            const newCol = this._currentNewMatrix.slice(i * GameScene.NUMBER_OF_ROWS, (i + 1) * GameScene.NUMBER_OF_ROWS);
            for (let k = 0; k < gapsBelow; k++) {
                const newSymbol = newCol[k];
                const sprite = new PIXI.Sprite(symbolTextures[newSymbol]);
                sprite.anchor.set(0.5);
                sprite.x = 0;
                sprite['targetY'] = k * GameScene.SYMBOL_HEIGHT - boardHeight / 2 + GameScene.SYMBOL_HEIGHT / 2;
                sprite.y = sprite['targetY'] - fallFromAbove;
                reel.container.addChild(sprite);
                reel.fallingNewSprites.push(sprite);
            }
        }
        this._gameState = GameState.Falling;
    }

    private _finishFalling(): void {
        for (let i = 0; i < this._reels.length; i++) {
            const reel = this._reels[i];
            reel.symbols = reel.symbols.filter(s => s.visible);
            reel.symbols = reel.fallingNewSprites.concat(reel.symbols);
            reel.fallingNewSprites = [];
            const newCol = this._currentNewMatrix.slice(i * GameScene.NUMBER_OF_ROWS, (i + 1) * GameScene.NUMBER_OF_ROWS);
            for (let j = 0; j < reel.symbols.length; j++) {
                const symbolIndex = j % GameScene.NUMBER_OF_ROWS;
                reel.symbols[j].texture = symbolTextures[newCol[symbolIndex]];
                reel.symbols[j].y = j * GameScene.SYMBOL_HEIGHT - (GameScene.SYMBOL_HEIGHT * GameScene.NUMBER_OF_ROWS) / 2 + GameScene.SYMBOL_HEIGHT / 2;
                reel.symbols[j].visible = true;
                delete reel.symbols[j]['targetY'];
            }
        }
        this._currentMatrix = this._currentNewMatrix;
        this._winningPositions.clear();
        this._gameState = GameState.Resolving;
        console.log("Falling complete. Checking for new combine.");
        this._processCombine(this._currentCombine);
    }

    private _onAssetsLoaded(loader: PIXI.Loader, resources: any): void {
        this._logoSprite = new PIXI.Sprite(resources['logo'].texture);
        symbolTypes.forEach(t => {
            symbolTextures[t] = resources[`symbol_${t}`].texture;
            if (resources[`symbol_${t}_blur`]) {
                symbolTextures[`${t}_blur`] = resources[`symbol_${t}_blur`].texture;
            }
        });
        this.init();
    }
}