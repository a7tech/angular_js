(function() {
    'use strict';

    angular.module('mean.directives')
        .directive('checklist', function(_) {
            return {
                restrict: 'E',
                templateUrl: 'directives/checklist/checklist.html',
                scope: {
                    items: '=',
                    productId: '@',
                    questionnaireId: '@',
                    accountId: '@'
                },
                link: function(scope, element, attrs) {
                }
            }
        });
})();