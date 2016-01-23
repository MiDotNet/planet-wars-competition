﻿/// <reference path="../excalibur-0.6.0.d.ts"/>
/// <reference path="../typings/lodash/lodash.d.ts"/>
/// <reference path="Config.ts"/>
/// <reference path="Assets.ts"/>
/// <reference path="Planet.ts"/>

class GameSession {
   
   static Game: ex.Engine;
   static Id: number;
   static State: Server.StatusResult;

   static create(gameId: number) {
      GameSession.Id = gameId;

      var game = new ex.Engine({
         canvasElementId: "game",
         height: 480,
         width: 720         
      });
      game.backgroundColor = ex.Color.Black;

      // load assets
      var loader = new ex.Loader();      
      _.forIn(Assets, (a) => loader.addResource(a));

      game.start(loader).then(GameSession.init);

      GameSession.Game = game;
   }

   // Game Objects
   private static _planets: { [key: number]: Planet } = [];
   private static _fleets: { [key: number]: Fleet } = [];
   private static _turnTimer: ex.Timer;

   static init() {

      this.updateSessionState().then(() => {

         this._turnTimer = new ex.Timer(() => this.updateSessionState(), this.getTurnDuration(), true);

      });

   }

   static mapPlanetSize(s: number) {
      return ((Config.PlanetMaxSize - Config.PlanetMinSize) / Config.PlanetMaxSize) * s;
   }

   static mapServerCoordsToWorld(p: Server.Point): ex.Point {
      // all planet pos
      var px = _.map(GameSession.State.planets, k => k.position.x);
      var py = _.map(GameSession.State.planets, k => k.position.y);

      // min/max ranges of planet pos
      var pxMin = _.min(px);
      var pxMax = _.max(px);
      var pyMin = _.min(py);
      var pyMax = _.max(py);

      // relative scale factors
      var sfx = (pxMax - pxMin) / pxMax;
      var sfy = (pyMax - pyMin) / pyMax;

      // position in grid world will be 
      var x = p.x * (sfx * Config.MapSize);
      var y = p.y * (sfy * Config.MapSize);

      // drawable space starts after padding
      x += Config.MapPadding;
      y += Config.MapPadding;
      
      return new ex.Point(x, y);
   }

   static updateSessionState(): JQueryPromise<Server.StatusResult> {

      return $.post("/api/status", { gameId: this.Id }).then(s => {
         GameSession.State = <Server.StatusResult>s;

         // add planets to game
         _.each(GameSession.State.planets, (p) => {
            var planet = new Planet(p);

            if (!this._planets[p.id]) {
               this.Game.add(planet);
            }
            this._planets[p.id] = planet;
         });

         // add fleets
         _.each(GameSession.State.fleets, (f) => {
            var fleet = Fleet.create(f);
            if (!this._fleets[f.id]) {
               this.Game.add(fleet);
            }
            this._fleets[f.id] = fleet;            
         });
      });

   }

   static getPlanet(planetId: number) {
      if (!this._planets[planetId]) {
         throw "Planet does not exist";
      }

      return this._planets[planetId];
   }

   static getOwnerColor(ownerId: number) {
      return this.State.playerA === ownerId ? Config.PlayerAColor : Config.PlayerBColor;
   }

   static getTurnDuration() {
      return this.State.playerTurnDuration + this.State.serverTurnDuration;
   }
}