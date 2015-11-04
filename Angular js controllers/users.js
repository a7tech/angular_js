(function() {
    'use strict';

    angular.module('mean.users')
        .controller('ListUsersCtrl', function ($scope, Users, AlertService, ModalService) {
            Users.query(function(users) {
                $scope.users = users;
            });

            $scope.remove = function(index) {
                var onDeleteConfirmed = function(confirmed) {
                    if (index < $scope.users.length && index >= 0) {
                        var user = $scope.users[index];
                        user.$delete(function() {
                            $scope.users.splice(index, 1);
                            AlertService.success("Successfully removed user: " + user.name + " (" + user.email + ")");
                        }, function(response) {
                            AlertService.warn("Failed to delete user: " + JSON.stringify(response.data.msg));
                        });
                    }
                };

                ModalService.confirm("Delete User", "This action is permanent. Are you sure you want to delete this user?", onDeleteConfirmed);
            };
        })
        .controller('ShowUserCtrl', function ($scope, $stateParams, $location, Users, $http) {
            // TODO inject
            $scope.moment = moment;

            if (!$stateParams.userId) {
                $location.path('/');
            }

            Users.get({
                userId: $stateParams.userId
            }, function(user) {
                $scope.user = user;
            });
            
            $scope.userProfiles = function(){
                if($stateParams.userId){
                    $http.get('/users/profile/'+$stateParams.userId, $scope.user).
                    success(function(data) {
                        $scope.userProfileList = data;
                    }).
                    error(function(data, status, headers, config) {
                        console.log("Error to get list of user profiles!");
                    });
                }
            }
        })
        .controller('UserProfileCtrl', function ($scope, $stateParams, $location, Users, $http) {
            // TODO inject
            $scope.moment = moment;
            if (!$stateParams.userId && !$stateParams.profileId){
                $location.path('/');
            }
            $scope.emails = [];
            $scope.userId = $stateParams.userId;

            Users.get({
                userId: $stateParams.userId
            }, function(user) {
                $scope.userProfiles = user;
            });

            $http.get('/users/profile/'+$stateParams.userId+'/'+$stateParams.profileId, $scope.user).
            success(function(data) {
                $scope.user = data;
                var email = $scope.user.email.split(',');
                for (var i = 0; i < email.length; i++) {
                    $scope.emails.push({'email':email[i]});
                }
                $scope.user.email = $scope.emails;
            }).
            error(function(data, status, headers, config) {
                console.log("Error to get list of user profiles!");
            });

            $scope.userProfiles = function(){
                if($stateParams.userId){
                    $http.get('/users/profile/'+$stateParams.userId, $scope.user).
                    success(function(data) {
                        $scope.userProfileList = data;
                    }).
                    error(function(data, status, headers, config) {
                        console.log("Error to get list of user profiles!");
                    });
                }
            }
        })
        .controller('ShowProfileCtrl', function ($scope, $location, Users) {
            // TODO inject
            $scope.moment = moment;

            Users.get({
                userId: $scope.currentUser._id
            }, function(user) {
                $scope.user = user;
            });

            $scope.save = function() {
                $scope.user.$update(function() {
                    $location.path('/');
                });
            };
        })
        .controller('addProfileCtrl', function ($scope, $stateParams, $location, UserProfile ){
            
            $scope.email = '22';
            $scope.first_name ="";
            $scope.last_name ="";
            $scope.phone ="";
            $scope.address ="";
            $scope.SIN ="";
            $scope.postal ="";
            $scope.province ="";
            $scope.city ="";
            $scope.birthday =[2015,0,1];
            

            // save data
            $scope.save = function(){
                var scope = angular.element('input').scope();
                alert(scope.email);
                alert($scope.email);
                var email = $scope.email;
                for (var i = 0; i < $scope.totalEmail.length; i++) {
                   email = email+','+$scope.totalEmail[i].email;
                }
                var request = $http({
                    method: "post",
                    url: '/users/profile/'+$stateParams.userId,
                    data: {
                        email: email,
                        first_name: $scope.first_name,
                        last_name: $scope.last_name,
                        phone: $scope.phone,
                        address: $scope.address,
                        SIN: $scope.SIN,
                        postal: $scope.postal,
                        province: $scope.province,
                        city: $scope.city,
                        year: $scope.birthday[0],
                        month: $scope.birthday[1],
                        date: $scope.birthday[2]
                    }
                });
                request.success(
                    function(data) {
                        console.log(data);
                        //$location.path('users/'+$stateParams.userId);
                    }
                );
                request.error(
                    function(data) {
                        console.log(data);
                        //$location.path('users/'+$stateParams.userId);
                    }
                );
            };

            $scope.totalEmail = [];
            $scope.userId = $stateParams.userId;

            // add more emails            
            $scope.userId = $stateParams.userId;
            $scope.addNewChoice = function() {
                var newItemNo = $scope.totalEmail.length+1;
                $scope.totalEmail.push({'email':''});
            };
            // delete emails
            $scope.removeChoice = function() {                
                var lastItem = $scope.totalEmail.length-1;
                $scope.totalEmail.splice(lastItem);
            };
        })
        .controller('EditProfileCtrl', function ($scope, $stateParams, $location, Users,$http) {
            $scope.moment = moment;
            if (!$stateParams.userId && !$stateParams.profileId){
                $location.path('/');
            }

            $scope.userId = $stateParams.userId;
            $scope.totalEmail = [];
            $http.get('/users/profile/'+$stateParams.userId+'/'+$stateParams.profileId, $scope.user).
            success(function(data) {
                $scope.user = data;
                var email = $scope.user.email.split(',');
                for (var i = 0; i < email.length; i++) {
                    if(i!=0)
                    $scope.totalEmail.push({'email':email[i]});
                    else
                    $scope.user.email = email[i];
                }
            }).
            error(function(data, status, headers, config) {
                console.log("Error to get list of user profiles!");
            });

            // add more emails            
            $scope.userId = $stateParams.userId;
            $scope.addNewChoice = function() {
                var newItemNo = $scope.totalEmail.length+1;
                $scope.totalEmail.push({'email':''});
            };
            // delete emails
            $scope.removeChoice = function() {                
                var lastItem = $scope.totalEmail.length-1;
                $scope.totalEmail.splice(lastItem);
            };
            // save data
            $scope.save = function(){
                var email = $scope.user.email;
                for (var i = 0; i < $scope.totalEmail.length; i++) {
                   email = email+','+$scope.totalEmail[i].email;
                }
                var request = $http({
                    method: "post",
                    url: '/users/profile/'+$stateParams.userId,
                    data: {
                        email: email,
                        first_name: $scope.user.first_name,
                        last_name: $scope.user.last_name,
                        phone: $scope.user.phone,
                        address: $scope.user.address,
                        SIN: $scope.user.SIN,
                        postal: $scope.user.postal,
                        province: $scope.user.province,
                        city: $scope.user.city,
                        year: $scope.user.birthday[0],
                        month: $scope.user.birthday[1],
                        date: $scope.user.birthday[2],
                        profileId: $scope.user._id
                    }
                });
                request.success(
                    function(data) {
                        $location.path('users/profile/'+$stateParams.userId+'/'+$scope.user._id);
                    }
                );
                request.error(
                    function(data) {
                        $location.path('users/profile/'+$stateParams.userId+'/'+$scope.user._id);
                    }
                );
            };
        })
        .controller('EditUserCtrl', function ($scope, $stateParams, $location, Users) {
            Users.get({
                userId: $stateParams.userId
            }, function(user) {
                $scope.user = user;
            });

            $scope.save = function() {
                $scope.user.$update(function() {
                    $location.path('/users/' + $scope.user._id);
                });
            };
        });
})();