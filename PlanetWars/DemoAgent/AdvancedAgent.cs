using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using PlanetWars.Shared;

namespace PlanetWars.DemoAgent
{
    public class AdvancedAgent : AgentBase
    {
        public AdvancedAgent(int gameId) : base("ADVANCED CPU", gameId, MapGenerationOption.None)
        {
        }

        public override void Update(StatusResult gs)
        {
            var myPlanets = gs.Planets.Where(x => x.OwnerId == MyId);

            foreach (var planet in myPlanets)
            {
                var incomingEnemy = gs.Fleets.Where(x => x.DestinationPlanetId == planet.Id);

                if (incomingEnemy.Any())
                {
                    var timeTillAttack = incomingEnemy.OrderBy(x => x.NumberOfTurnsToDestination).First().NumberOfTurnsToDestination;
                    var totalEnemy = incomingEnemy.Sum(x => x.NumberOfShips);

                    if (totalEnemy < planet.NumberOfShips + (timeTillAttack * planet.GrowthRate))
                    {
                        var availableShips = planet.NumberOfShips - totalEnemy;
                        if (availableShips > 0)
                        {
                            var targetPlanet = GetTargetPlanet(gs, planet);
                            if (targetPlanet == null) return;
                            SendFleet(planet.Id, targetPlanet.Id, availableShips);
                        }
                    }
                }
                else
                {
                    var targetPlanet = GetTargetPlanet(gs, planet);
                    if (targetPlanet == null) return;
                    var availableShips = planet.NumberOfShips - planet.GrowthRate;
                    var minimumAttack = targetPlanet.GrowthRate + 1;
                    if (availableShips > minimumAttack)
                    {
                        SendFleet(planet.Id, targetPlanet.Id, availableShips);
                    }
                }
            }
        }

        private Planet GetTargetPlanet(StatusResult gs, Planet attackingPlanet)
        {
            var enemyId = gs.PlayerA == MyId ? gs.PlayerB : gs.PlayerA;
            var enemyPlanets = gs.Planets.Where(x => x.OwnerId == enemyId);
            var unownedPlanets = gs.Planets.Where(x => x.OwnerId == -1);

            var targetedPlanets = unownedPlanets.Union(enemyPlanets);

            var potentials = targetedPlanets.Select(x => new
            {
                Planet = x,
                CostToTake = ((double)x.NumberOfShips / x.GrowthRate) + (x.Position.Distance(attackingPlanet.Position) / 2)
            });

            return potentials.OrderBy(x => x.CostToTake).Select(x => x.Planet).FirstOrDefault();
        }
    }
}