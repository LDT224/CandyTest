import * as PIXI from 'pixi.js';
import { GameScene } from './GameScene';
import Server from './Server';

export class MainApp {
    public static inst: MainApp;

    public app: PIXI.Application;

    public constructor () {
        MainApp.inst = this;

        console.log('MainApp constructor');
        const canvas = <HTMLCanvasElement> document.getElementById('GameCanvas');
        this.app = new PIXI.Application({
            backgroundColor: 0xefe1de,
            width: 800,
            height: 960,
            view: canvas
        });
        document.body.appendChild(this.app.view);

        this.app.stage.addChild(new GameScene(new Server()));

        // 🔥 Hook PixiJS Devtools
        (window as any).__PIXI_APP__ = this.app;
    }
}

window.onload = function () {
    new MainApp();
};
