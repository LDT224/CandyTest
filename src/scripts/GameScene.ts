import * as PIXI from 'pixi.js';
import { MainApp } from './app';
import Server from './Server';

enum GameState {
    Idle = 'Idle',
    Spinning = 'Spinning',
    Resolving = 'Resolving',
}

const symbolTextures = {
    // '1' : null,
    // '2' : null,
    // '3' : null,
    // '4' : null,
    // '5' : null,
    // '6' : null,
    // '7' : null,
    // '8' : null,
    // 'K' : null
};

const symbolTypes = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'K'];
export class GameScene extends PIXI.Container {
    constructor(server: Server) {
        super();

        /**
         * Register spin data responded event handler
         */
        this._server = server;
        this._server.registerDataRespondEvent(this._onSpinDataResponded.bind(this));

        /**
         * Added onUpdate function to PIXI Ticker so it will be called every frame
         */
        MainApp.inst.app.ticker.add(this.onUpdate, this);
        /**
         * Ask PIXI Loader to load needed resources
         */
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
            .load(this._onAssetsLoaded.bind(this));
    }

    static readonly NUMBER_OF_REELS = 5;
    static readonly NUMBER_OF_ROWS = 5;
    static readonly SYMBOL_WIDTH = 110;
    static readonly SYMBOL_HEIGHT = 100;

    private _server: Server;

    private _isInitialized: boolean = false;
    private _logoSprite: PIXI.Sprite;
    private _spinText: PIXI.Text;

    private _gameState: GameState = GameState.Idle;
    private _boardContainer!: PIXI.Container;
    private _boardSprites: PIXI.Sprite[] = [];
    private _currentMatrix: string[] = [];

    public init(): void {
        // --- logo ---
        this.addChild(this._logoSprite);
        this._logoSprite.position.set(760 / 2, 100);
        this._logoSprite.anchor.set(0.5);
        this._logoSprite.scale.set(0.5);

        // --- spin text ---
        const style = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 36,
            fontWeight: 'bold',
            fill: ['#ffffff', '#00ff99'], // gradient
            stroke: '#4a1850',
            strokeThickness: 5,
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 4,
            dropShadowAngle: Math.PI / 6,
            dropShadowDistance: 6,
            wordWrap: true,
            wordWrapWidth: 440,
        });

        this._spinText = new PIXI.Text('Start Spin', style);
        this._spinText.x = 800 / 2 - this._spinText.width / 2;
        this._spinText.y = MainApp.inst.app.screen.height - 200;
        this.addChild(this._spinText);

        this._spinText.interactive = true;
        this._spinText.buttonMode = true;
        this._spinText.addListener('pointerdown', this._startSpin.bind(this));

        // --- board container ---
        this._boardContainer = new PIXI.Container();
        this.addChild(this._boardContainer);
        this._boardContainer.position = new PIXI.Point(800 / 2, 960 / 2);

        const boardWidth = GameScene.SYMBOL_WIDTH * GameScene.NUMBER_OF_REELS;
        const boardHeight = GameScene.SYMBOL_HEIGHT * GameScene.NUMBER_OF_ROWS;

        // --- default board ---
        const defaultBoard = [
            'K', '3', '7', '6', '8',
            '4', '7', '6', '8', '5',
            '7', '6', '8', '5', '7',
            '6', '8', '5', '7', '2',
            '8', '5', '7', '1', 'K'
        ];

        this._boardSprites = [];
        for (let idx = 0; idx < GameScene.NUMBER_OF_REELS * GameScene.NUMBER_OF_ROWS; idx++) {
            const col = Math.floor(idx / GameScene.NUMBER_OF_ROWS);
            const row = idx % GameScene.NUMBER_OF_ROWS;

            const x = col * GameScene.SYMBOL_WIDTH - boardWidth / 2 + GameScene.SYMBOL_WIDTH / 2;
            const y = row * GameScene.SYMBOL_HEIGHT - boardHeight / 2 + GameScene.SYMBOL_HEIGHT / 2;

            const spr = new PIXI.Sprite();
            spr.anchor.set(0.5);
            spr.position.set(x, y);

            const sym = defaultBoard[idx];
            if (symbolTextures[sym]) {
                spr.texture = symbolTextures[sym];
                spr.alpha = 1;
            } else {
                spr.alpha = 0;
            }

            this._boardContainer.addChild(spr);
            this._boardSprites.push(spr);
        }

        this._isInitialized = true;
    }

    public onUpdate(dtScalar: number) {
        const dt = dtScalar / PIXI.settings.TARGET_FPMS / 1000;
        if (this._isInitialized) {
            /**
             * Update objects in scene here using dt (delta time)
             * TODO: should call all update function of all the objects in Scene
             */
            this._logoSprite.rotation += 0.01;
        }
    }

    private _startSpin(): void {
        if (this._gameState !== GameState.Idle) {
            console.log('still in turn');
            return;
        }
        console.log(`start turn`);
        this._gameState = GameState.Spinning;
        this._server.requestSpinData();
    }

    private _onSpinDataResponded(data: any): void {
        console.log(`received: ${data?.matrix}`);
        /**
         * Received data from server.
         * TODO: should proceed in client here to stop the spin or refill and show result.
         */
        this._renderFullBoard(data.matrix);

        if (data.combine && data.combine.length > 0) {
            this._gameState = GameState.Resolving;
            this._processCombine(data.combine);
        } else {
            this._gameState = GameState.Idle;
            console.log('end turn');
        }
    }

    private _onAssetsLoaded(loaderInstance: PIXI.Loader, resources: Partial<Record<string, PIXI.LoaderResource>>): void {
        /**
         * After loading process is finished this function will be called
         */
        this._logoSprite = new PIXI.Sprite(resources['logo'].texture);
        symbolTypes.forEach((type) => {
            symbolTextures[type] = resources[`symbol_${type}`].texture;
        });
        this.init();
    }

    private _renderFullBoard(matrix: string[]): void {
        this._currentMatrix = matrix;

        matrix.forEach((sym, idx) => {
            const spr = this._boardSprites[idx];
            if (symbolTextures[sym]) {
                spr.texture = symbolTextures[sym];
                spr.alpha = 1;
            } else {
                spr.alpha = 0;
            }
        });
    }

    private _processCombine(combine: string[]) {
        combine.forEach(entry => {
            const [sym, posStr, score] = entry.split(";");
            const indexes = posStr.split(",").map(n => parseInt(n));
            indexes.forEach(idx => {
                const spr = this._boardSprites[idx];
                spr.alpha = 0.3;
            });
        });

        setTimeout(() => {
            combine.forEach(entry => {
                const [sym, posStr, score] = entry.split(";");
                const indexes = posStr.split(",").map(n => parseInt(n));
                indexes.forEach(idx => {
                    const spr = this._boardSprites[idx];
                    spr.alpha = 0;
                });
            });

            this._server.requestSpinData();
        }, 500);
    }
}