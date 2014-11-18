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
          .when('/configuration', {
            templateUrl: 'app/templates/configuration.html',
            controller: 'ConfigurationCtrl'
          })
          .otherwise({ redirectTo: '/start' });
    }])
    .filter('percent', function () {
      return function (value) {
        var fValue = parseFloat(value);

        if (!isNaN(fValue)) {
          return parseInt(fValue * 100) + ' %';
        }
      };
    })
    .factory('Configuration', function ($window) {
      var defaultConfiguration = {
        maxPumps: 128,
        maxBalloons: 30,
        winningsPerPump: .05,
        blowVolume: .7,
        popVolume: .9,
        cashVolume: .7
      };

      return {
        get: function () {
          return angular.fromJson($window.localStorage.getItem('configuration') || defaultConfiguration);
        },
        set: function (value) {
          $window.localStorage.setItem('configuration', angular.toJson(value));
        },
        reset: function () {
          this.set(defaultConfiguration);
        }
      };
    })
    .constant('Resources', {
      blowSound: 'app/media/Balloon%20Blowing%20Up-SoundBible.com-1989230335.mp3',
      popSound: 'app/media/Balloon%20Popping-SoundBible.com-1247261379.mp3',
      cashSound: 'app/media/Cash%20Register%20Cha%20Ching-SoundBible.com-184076484.mp3'
    })
    .factory('OnClickGo', function ($timeout, $window, $location) {
      return function ($scope, path) {
        $timeout(function () {
          angular.element($window.document).one('click', function () {
            $timeout(function () {
              $location.url(path);
            }, 0);
          });
        }, 1000);

        $scope.$on('$destroy', function () {
          angular.element($window.document).off('click');
        });
      }
    })
    .controller('StartCtrl', function ($scope, Configuration, OnClickGo) {
      var configuration = Configuration.get();

      $scope.winningsPerPump = configuration.winningsPerPump;
      $scope.maxBalloons = configuration.maxBalloons;

      OnClickGo($scope, '/summary');
    })
    .controller('SummaryCtrl', function ($scope, Configuration, OnClickGo) {
      var configuration = Configuration.get();

      $scope.winningsPerPump = configuration.winningsPerPump;
      $scope.maxBalloons = configuration.maxBalloons;

      OnClickGo($scope, '/game');
    })
    .controller('GameCtrl', function ($scope, $location, $filter, $timeout, Game, Configuration, Resources) {
      var configuration = Configuration.get(),
          maxPumps = configuration.maxPumps,
          game = new Game(),
          minBalloonHeight = 200,
          balloon = $('#balloon'),
          blow = $('#blow')[0],
          pop = $('#pop')[0],
          cash = $('#cash')[0],
          number = $filter('number');

      angular.extend($scope, Resources);

      blow.volume = configuration.blowVolume;
      pop.volume = configuration.popVolume;
      cash.volume = configuration.cashVolume;

      $scope.balloonHeight = minBalloonHeight;

      $scope.potentialEarnings = 0;
      $scope.balloonNumber = 1;
      $scope.numberOfPumps = 0;
      $scope.totalWinnings = 0;

      function downloadFile(fileName, contents) {
        var link = document.createElement("a");

        if (link.download !== undefined) { // feature detection
          // Browsers that support HTML5 download attribute
          var blob = new Blob([contents], { type: 'text/csv;charset=utf-8;' });
          var url = window.URL.createObjectURL(blob);
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

      function stopAllSounds() {
        $('audio').each(function () {
          this.pause();
          this.currentTime = 0;
        });
      }

      function getMaximumBalloonHeight() {
        return balloon.offset().top + $scope.balloonHeight;
      }

      function increaseBalloonSize() {
        $scope.balloonHeight += (getMaximumBalloonHeight() - minBalloonHeight) / (maxPumps - 1);
      }

      function resetBalloonSize() {
        $scope.balloonHeight = minBalloonHeight;
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
        $scope.balloonExploded = balloonExploded;

        if (balloonExploded) {
          $timeout(function () {
            $scope.balloonExploded = false;
          }, 1000);
        }

        if (balloonExploded) {
          stopAllSounds();
          pop.play();
          resetBalloonSize();
        }

        if (!gameContinues) {
          var summary = Object.keys(stats.summary).join('\t');
          summary += '\r\n';

          for (var key in stats.summary) {
            summary += number(stats.summary[key]) + '\t';
          }

          downloadFile('summary-' + moment().format('DDMMYYYY-HHmmss') + '.txt', summary);

          $location.url('/end?totalWinnings=' + totalWinnings);
        }
      }

      $scope.pump = function () {
        stopAllSounds();
        blow.play();

        increaseBalloonSize();

        game.pump(handleCallback);
      };

      $scope.collectWinnings = function () {
        stopAllSounds();
        cash.play();

        resetBalloonSize();

        game.collect(handleCallback);
      };
    })
    .controller('ConfigurationCtrl', function ($scope, $location, Configuration, Resources) {
      var blow = $('#blow')[0],
          pop = $('#pop')[0],
          cash = $('#cash')[0];

      $scope.c = {};

      angular.extend($scope.c, Configuration.get());
      angular.extend($scope, Resources);

      var clearWatch = $scope.$watchCollection('c', function (newNames) {
        Configuration.set(newNames);
      });

      $scope.$on('$destroy', clearWatch);

      function stopAll() {
        $('audio').each(function () {
          this.pause();
          this.currentTime = 0;
        });
      }

      $scope.playBlow = function () {
        stopAll();
        blow.play();
      };

      $scope.playPop = function () {
        stopAll();
        pop.play();
      };

      $scope.playCash = function () {
        stopAll();
        cash.play();
      };

      $scope.setBlowVolume = function () {
        blow.volume = $scope.c.blowVolume;
      };

      $scope.setPopVolume = function () {
        pop.volume = $scope.c.popVolume;
      };

      $scope.setCashVolume = function () {
        cash.volume = $scope.c.cashVolume;
      };

      $scope.reset = function () {
        Configuration.reset();
        angular.extend($scope.c, Configuration.get());
      };

      $scope.back = function ($event) {
        $event.stopPropagation();
        $location.path('/start');
      };

      $scope.setBlowVolume();
      $scope.setPopVolume();
      $scope.setCashVolume();
    })
    .controller('EndCtrl', function ($scope, $routeParams) {
      $scope.winnings = $routeParams.totalWinnings;
    })
    .factory('Balloon', function (Configuration) {
      return function Balloon() {
        var pumps = 0,
            exploded = false,
            config = Configuration.get();

        this.getCurrentEarnings = function () {
          return pumps * config.winningsPerPump;
        };

        this.getPumps = function () {
          return pumps;
        };

        this.hasExploded = function () {
          return exploded;
        };

        this.pump = function (cb) {
          pumps++;

          if (!Math.floor(Math.random() * (config.maxPumps - pumps + 1))) {
            return cb(exploded = true, false, pumps, 0);
          }

          cb(false, pumps < config.maxPumps, pumps, pumps * config.winningsPerPump);
        };
      }
    })
    .factory('Game', function (Balloon, Configuration) {
      return function Game() {
        var maxBalloons = Configuration.get().maxBalloons;

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

          balloon = new Balloon();
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
            adjustedAveragePumpCount: countPumps(getNonExploded(stats.balloons)) /
            getNonExploded(stats.balloons).length,
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

            if (!canPumpAgain) {
              if (gameContinues) {
                numberOfPumps = 0;
                createBalloon();
              }

              if (!exploded) {
                winnings += balloonEarnings;
                balloonEarnings = 0;
              }
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