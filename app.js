'use strict';

// Declare app level module which depends on views, and components
angular.module('myApp', ['ngRoute'])
    .config(['$routeProvider', function ($routeProvider) {
      $routeProvider
          .when('/start', {
            templateUrl: 'templates/start.html',
            controller: 'StartCtrl'
          })
          .when('/summary', {
            templateUrl: 'templates/summary.html',
            controller: 'SummaryCtrl'
          })
          .when('/test', {
            templateUrl: 'templates/test.html',
            controller: 'TestCtrl'
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
        $location.url('/test');
      };
    })
    .controller('TestCtrl', function ($scope, $location, Game) {
      var game = new Game(64, 30, 0.05);

      $scope.potentialEarnings = 0;
      $scope.balloonNumber = 1;
      $scope.numberOfPumps = 0;
      $scope.totalWinnings = 0;

      function handleCallback(gameContinues,
                              balloonExploded,
                              balloonEarnings,
                              currentBalloon,
                              numberOfPumps,
                              totalWinnings) {
        $scope.potentialEarnings = balloonEarnings;
        $scope.balloonNumber = currentBalloon;
        $scope.numberOfPumps = numberOfPumps;
        $scope.totalWinnings = totalWinnings;

        if(!gameContinues) {
          return $location.url('/end');
        }
      }

      $scope.pump = function () {
        game.pump(handleCallback);
      };

      $scope.collectWinnings = function () {
        game.collect(handleCallback);
      };
    })
    .factory('Game', function () {
      function Balloon(maxPumps, winningPerPump) {
        var pumps = 0;

        this.getCurrentEarnings = function () {
          return pumps * winningPerPump;
        };

        this.pump = function (cb) {
          var explode = Math.floor((Math.random() * (maxPumps - pumps - 1)) + 1) === 1;

          pumps++;

          if (explode) {
            return cb(true, false, pumps, 0);
          }

          cb(false, pumps < maxPumps, pumps, pumps * winningPerPump);
        };
      }

      return function Game(maxPumps, maxBalloons, winningPerPump) {
        var currentBalloonCount = 1,
            winnings = 0,
            balloon = new Balloon(maxPumps, winningPerPump);

        this.pump = function (cb) {
          balloon.pump(function (exploded, canPumpAgain, numberOfPumps, balloonEarnings) {

            var gameContinues = canPumpAgain || currentBalloonCount < maxBalloons;

            if (!canPumpAgain && gameContinues) {
              currentBalloonCount++;
              balloon = new Balloon(maxPumps, winningPerPump);
            }

            if (!canPumpAgain && !exploded) {
              winnings += balloonEarnings;
              balloonEarnings = 0;
            }

            return cb(
                gameContinues,
                exploded,
                balloonEarnings,
                currentBalloonCount,
                numberOfPumps,
                winnings);
          });
        };

        this.collect = function (cb) {
          var gameContinues = currentBalloonCount < maxBalloons;

          winnings += balloon.getCurrentEarnings();

          if (gameContinues) {
            balloon = new Balloon(maxPumps, winningPerPump);
            currentBalloonCount++;
          }

          cb(gameContinues, false, 0, currentBalloonCount, 0, winnings);
        };
      };
    });
