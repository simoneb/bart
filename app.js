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
          .otherwise({ redirectTo: '/start' });
    }])
    .controller('StartCtrl', function ($scope, $location) {
      $scope.next = function () {
        console.log('here');
        $location.url('/summary');
      };
    })
    .controller('SummaryCtrl', function ($scope) {

    });
