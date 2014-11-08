'use strict';

// Declare app level module which depends on views, and components
angular.module('bart', ['ngRoute'])
    .config(['$routeProvider', function ($routeProvider) {
      $routeProvider
          .when('/start', {
            templateUrl: 'app/templates/start.html',
            controller: 'StartCtrl'
          })
          .when('/summary', {
            templateUrl: 'app/templates/summary.html',
            controller: 'SummaryCtrl'
          })
          .when('/game', {
            templateUrl: 'app/templates/game.html',
            controller: 'GameCtrl'
          })
          .when('/end', {
            templateUrl: 'app/templates/end.html',
            controller: 'EndCtrl'
          })
          .otherwise({ redirectTo: '/start' });
    }])
    .controller('StartCtrl', function ($scope, $location) {
      $scope.next = function () {
        $location.url('/summary');
      };
    })
    .controller('SummaryCtrl', function ($scope, $location) {
      $scope.next = function () {
        $location.url('/game');
      };
    })
    .controller('GameCtrl', function ($scope, $location, Game) {
      var game = new Game(128, 30, 0.05);

      $scope.potentialEarnings = 0;
      $scope.balloonNumber = 1;
      $scope.numberOfPumps = 0;
      $scope.totalWinnings = 0;

      function downloadFile(fileName, contents) {
        var link = document.createElement("a");

        if (link.download !== undefined) { // feature detection
          // Browsers that support HTML5 download attribute
          var blob = new Blob([contents], { type: 'text/csv;charset=utf-8;' });
          var url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", fileName);
          link.style = "visibility:hidden";
        }

        if (navigator.msSaveBlob) { // IE 10+
          link.addEventListener("click", function (event) {
            var blob = new Blob([contents], {
              "type": "text/csv;charset=utf-8;"
            });
            navigator.msSaveBlob(blob, fileName);
          }, false);
        }

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      function handleCallback(gameContinues,
                              balloonExploded,
                              balloonEarnings,
                              currentBalloon,
                              numberOfPumps,
                              totalWinnings,
                              stats) {
        $scope.potentialEarnings = balloonEarnings;
        $scope.balloonNumber = currentBalloon;
        $scope.numberOfPumps = numberOfPumps;
        $scope.totalWinnings = totalWinnings;
        $scope.stats = stats;

        if (balloonExploded) alert('booom!');

        if (!gameContinues) {
          var summary = Object.keys(stats.summary).join('\t');
          summary += '\n';

          for (var key in stats.summary) {
            summary += stats.summary[key] + '\t';
          }

          downloadFile('summary-' + moment().format('DDMMYYYY-HHmmss') + '.txt', summary);

          $location.url('/end?totalWinnings=' + totalWinnings);
        }
      }

      $scope.pump = function () {
        game.pump(handleCallback);
      };

      $scope.collectWinnings = function () {
        game.collect(handleCallback);
      };
    })
    .controller('EndCtrl', function ($scope, $routeParams) {
      $scope.winnings = $routeParams.totalWinnings;
    })
    .factory('Game', function () {
      function Balloon(maxPumps, winningsPerPump) {
        var pumps = 0,
            exploded = false;

        this.getCurrentEarnings = function () {
          return pumps * winningsPerPump;
        };

        this.getPumps = function () {
          return pumps;
        };

        this.hasExploded = function () {
          return exploded;
        };

        this.pump = function (cb) {
          pumps++;

          if (!Math.floor(Math.random() * (maxPumps - pumps + 1))) {
            return cb(exploded = true, false, pumps, 0);
          }

          cb(false, pumps < maxPumps, pumps, pumps * winningsPerPump);
        };
      }

      return function Game(maxPumps, maxBalloons, winningPerPump) {
        var currentBalloonCount = 0,
            winnings = 0,
            balloon,
            stats = {
              start: moment(),
              balloons: []
            };

        function createBalloonStats() {
          stats.balloons.push({
            number: currentBalloonCount,
            pumps: balloon.getPumps(),
            exploded: balloon.hasExploded()
          });
        }

        function createBalloon() {
          if (balloon)
            createBalloonStats();

          balloon = new Balloon(maxPumps, winningPerPump);
          currentBalloonCount++;
        }

        createBalloon();

        function createSummary() {
          stats.end = moment();

          var firstTen = stats.balloons.filter(function (el, idx) {
                return idx < 10;
              }),
              secondTen = stats.balloons.filter(function (el, idx) {
                return idx >= 10 && idx < 20;
              }),
              thirdTen = stats.balloons.filter(function (el, idx) {
                return idx >= 20 && idx < 30;
              });

          function countPumps(balloons) {
            return balloons.reduce(function (acc, b) {
              return acc + b.pumps;
            }, 0);
          }

          function getExploded(balloons) {
            return balloons.filter(function (b) {
              return b.exploded;
            });
          }

          function getNonExploded(balloons) {
            return balloons.filter(function (b) {
              return !b.exploded;
            });
          }

          function countExplosions(balloons) {
            return getExploded(balloons).length;
          }

          function countNonExplosions(balloons) {
            return getNonExploded(balloons).length;
          }

          stats.summary = {
            elapsedTime: stats.end.diff(stats.start),
            completed: stats.balloons.length === maxBalloons,
            balloonCount: stats.balloons.length,
            balloonCount_10: firstTen.length,
            balloonCount_20: secondTen.length,
            balloonCount_30: thirdTen.length,
            totalPumpCount: countPumps(stats.balloons),
            totalPumpCount_10: countPumps(firstTen),
            totalPumpCount_20: countPumps(secondTen),
            totalPumpCount_30: countPumps(thirdTen),
            averagePumpCount: countPumps(stats.balloons) / stats.balloons.length,
            averagePumpCount_10: countPumps(firstTen) / firstTen.length,
            averagePumpCount_20: countPumps(secondTen) / secondTen.length,
            averagePumpCount_30: countPumps(thirdTen) / thirdTen.length,
            totalExplosions: countExplosions(stats.balloons),
            totalExplosions_10: countExplosions(firstTen),
            totalExplosions_20: countExplosions(secondTen),
            totalExplosions_30: countExplosions(thirdTen),
            nonExplodedBalloons: countNonExplosions(stats.balloons),
            nonExplodedBalloons_10: countNonExplosions(firstTen),
            nonExplodedBalloons_20: countNonExplosions(secondTen),
            nonExplodedBalloons_30: countNonExplosions(thirdTen),
            adjustedTotalPumpCount: countPumps(getNonExploded(stats.balloons)),
            adjustedTotalPumpCount_10: countPumps(getNonExploded(firstTen)),
            adjustedTotalPumpCount_20: countPumps(getNonExploded(secondTen)),
            adjustedTotalPumpCount_30: countPumps(getNonExploded(thirdTen)),
            adjustedAveragePumpCount: countPumps(getNonExploded(stats.balloons)) / getNonExploded(stats.balloons).length,
            adjustedAveragePumpCount_10: countPumps(getNonExploded(firstTen)) / getNonExploded(firstTen).length,
            adjustedAveragePumpCount_20: countPumps(getNonExploded(secondTen)) / getNonExploded(secondTen).length,
            adjustedAveragePumpCount_30: countPumps(getNonExploded(thirdTen)) / getNonExploded(thirdTen).length
          };
        }

        this.pump = function (cb) {
          if (!stats.latencyBeforeFirstPump) {
            stats.latencyBeforeFirstPump = moment().diff(stats.start);
          }

          balloon.pump(function (exploded, canPumpAgain, numberOfPumps, balloonEarnings) {
            var gameContinues = canPumpAgain || currentBalloonCount < maxBalloons;

            if (!canPumpAgain && gameContinues) {
              createBalloon();
            }

            if (!canPumpAgain && !exploded) {
              winnings += balloonEarnings;
              balloonEarnings = 0;
            }

            if (!gameContinues) {
              createBalloonStats();
              createSummary();
            }

            return cb(
                gameContinues,
                exploded,
                balloonEarnings,
                currentBalloonCount,
                numberOfPumps,
                winnings,
                stats);
          });
        };

        this.collect = function (cb) {
          var gameContinues = currentBalloonCount < maxBalloons;

          winnings += balloon.getCurrentEarnings();

          if (gameContinues) {
            createBalloon();
          } else {
            createBalloonStats();
            createSummary();
          }

          cb(gameContinues, false, 0, currentBalloonCount, 0, winnings, stats);
        };
      };
    });
