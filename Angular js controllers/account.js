(function() {
    'use strict';

    angular.module('mean.account').controller('ListUserAccountsCtrl', function ($scope, product, account, AlertService, $location, USER_ROLES) {
//        if ($scope.currentUser.role == USER_ROLES.customer && $scope.currentUser.accounts.length == 1) {
//            $location.path('/users/accounts/' + $scope.currentUser.accounts[0]);
//            return;
//        }



        // TODO redirect to questionnaires/:questionnaireId
//        Account.get({
//            accountId: $scope.currentUser.accounts[0]
//        }, function(account) {
//            $scope.account = account;
//            if (account.questionnaires.length === 0) {
//                Questionnaire.get({}, function(questionnaire) {
//                    $scope.account.questionnaires.push(questionnaire);
//                });
//            }
//        });

//        $scope.addAccount = function() {
//            var account = new Account({});
//            account.$save(function() {
//                AlertService.success("successfully added");
//            });
//        };
    })
        .controller('PaymentFormCtrl', function($scope, $modalInstance, amount) {
            $scope.amount = amount;
            $scope.close = function() {
                $modalInstance.dismiss('close');
            };

            $scope.stripeCallback = function (code, result) {
                if (result.error) {
                    window.alert('it failed! error: ' + result.error.message);
                } else {
                    $modalInstance.close(result);
                }
            };
        })
        .controller('ViewUserAccountReturnsCtrl', function($scope, product, $stateParams, angularLoad, $window, STRIPE_PUBLISHABLE_KEY, $modal, _) {
            $scope.accountId = $stateParams.accountId;
            $scope.product = product;
            $scope.productId = product._id;

            var documents = _.pluck(product.packages, 'preparedDocuments');
            documents = _.flatten(documents);
            $scope.hasDocumentsToSign = _.some(documents, function(doc) {
                return doc.requiresSignature;
            });

            $scope.getTotal = function(packg) {
                var costs = _.pluck(packg.preparedDocuments, 'cost');
                return _.reduce(costs, function(memo, num){ return memo + num; }, 0) || 0;
            };
        })
        .controller('ViewPreparedDocumentCtrl', function($scope, $stateParams, AuthService, FileUploader, AccountProductPackageItemSignature, AlertService) {
            var accountId = $stateParams.accountId;
            var productId = $stateParams.productId;
            var packageId = $scope.package._id;
            var itemId = $scope.preparedDocument._id;

            var getFileUploadPath = function() {
                return '/accounts/' + accountId + '/products/' + productId + '/packages/' + packageId + '/items/' + itemId + '/signatures';
            };

            var createUploader = function() {
                var headers = {};
                AuthService.addAuthorizationHeader(headers);
                return new FileUploader({
                    url: getFileUploadPath(),
                    headers: headers,
                    autoUpload: true
                });
            };

            var onSuccess = function (index) {
                return function() {
                    AlertService.success('Successfully removed return');
                    $scope.preparedDocument.signatures.splice(index, 1);
                };
            };

            var onFailure = function () {
                AlertService.success('Unable to remove return at this time');
            };

            var getSignature = function(index) {
                var signatures = $scope.preparedDocument.signatures;
                if (index >= 0 && index < signatures.length) {
                    return signatures[index];
                }
                return null;
            };

            $scope.remove = function(index) {
                var signature = getSignature(index);
                if (signature) {
                    AccountProductPackageItemSignature.delete({
                        accountId: accountId,
                        productId: productId,
                        packageId: packageId,
                        itemId: itemId,
                        signatureId: signature._id
                    }, onSuccess(index), onFailure);
                }
            };

            var save = function(signature) {
                var s = new AccountProductPackageItemSignature(signature);
                s.$update({
                        accountId: accountId,
                        productId: productId,
                        packageId: packageId,
                        itemId: itemId
                    },
                    function(signature) {
                        AlertService.success("Yay!");
                    });
            };

            $scope.unverify = function(index) {
                var signature = getSignature(index);
                if (signature) {
                    signature.verified = null;
                    save(signature);
                }
            };

            $scope.verify = function(index) {
                var signature = getSignature(index);
                if (signature) {
                    signature.verified = new Date();
                    save(signature);
                }
            };

            $scope.uploader = createUploader();

            $scope.uploader.onSuccessItem = function(fileItem, response) {
                $scope.preparedDocument.signatures = response;
            };
        })
        .controller('UploadPackageItemFile', function($scope, $stateParams, FileUploader, AuthService) {
            var accountId = $stateParams.accountId;
            var productId = $stateParams.productId;
            var packageId = $stateParams.packageId;

            var getFileUploadPath = function() {
                return '/accounts/' + accountId + '/products/' + productId + '/packages/' + packageId + '/items';
            };

            var createUploader = function() {
                var headers = {};
                AuthService.addAuthorizationHeader(headers);
                return new FileUploader({
                    url: getFileUploadPath(),
                    headers: headers,
                    autoUpload: true
                });
            };

            $scope.uploader = createUploader();
            $scope.uploader.onSuccessItem = function(fileItem, response) {
                $scope.package.preparedDocuments = response;
            };
        })
        .controller('ViewUserAccountReturnCtrl', function($scope, $stateParams, angularLoad, $window, STRIPE_PUBLISHABLE_KEY, $modal, AccountProductPackagePayment, AlertService) {
            $scope.accountId = $stateParams.accountId;
            $scope.productId = $stateParams.productId;

            var canPay = function() {
                return !$scope.package.purchased && $scope.getTotalCost() > 0;
            };

            $scope.getTotalCost = function() {
                var total = 0;
                var lineItemCosts = _.pluck($scope.package.line_items, 'cost');
                if (lineItemCosts.length > 0) {
                    total = _.reduce(lineItemCosts, function(memo, num){ return memo + num; });
                }
                return total;
            };

            if (canPay()) {
                angularLoad.loadScript('https://js.stripe.com/v2/').then(function() {
                    $window.Stripe.setPublishableKey(STRIPE_PUBLISHABLE_KEY);
                    $scope.allowPayments = true;

                    $scope.showPaymentForm = function() {
                        var modal = $modal.open({
                            templateUrl: 'views/payment/form.html',
                            controller: 'PaymentFormCtrl',
                            windowClass: 'small',
                            resolve: {
                                amount: function() {
                                    return $scope.package.cost;
                                }
                            }
                        });

                        modal.result.then(function (card) {
                            var payment = new AccountProductPackagePayment(card);
                            payment.$save({
                                accountId: $scope.accountId,
                                productId: $scope.productId,
                                packageId: $scope.package._id
                            }, function(data) {
                                $scope.package = data;
                                AlertService.success("Thank you for your payment.");
                            }, function() {
                                AlertService.warn('Sorry, we encountered an unexpected error, plese try again.');
                            });
                        });
                    };
                }).catch(function() {
                        console.log("no payment");
                    });
            }
        })
        .controller('EditUserAccountReturnCtrl', function($scope, packg, $stateParams, AlertService, $location, AccountProductPackageItem) {
            var accountId = $stateParams.accountId;
            var productId = $stateParams.productId;
            $scope.package = packg;

            $scope.removeLineItem = function($index) {
                $scope.package.line_items.splice($index, 1);
            };

            $scope.remove = function() {
                var onSuccess = function () {
                    AlertService.success('Successfully removed return');
                    $location.path('/users/accounts/' + accountId + '/products/' + productId + '/returns');
                };

                var onFailure = function () {
                    AlertService.success('Unable to remove return at this time');
                };

                $scope.package.$delete({
                    accountId: accountId,
                    productId: productId
                }, onSuccess, onFailure);
            };

            $scope.save = function() {
                var onSuccess = function (data) {
                    AlertService.success('Successfully saved return');
                    $location.path('/users/accounts/' + accountId + '/products/' + productId + '/returns');
                };

                var onFailure = function (data) {
                    AlertService.success('Unable to save return at this time');
                };

                $scope.package.$update({
                    accountId: accountId,
                    productId: productId
                }, onSuccess, onFailure);
            };

            $scope.removeItem = function(index) {
                var onItemRemoved = function(data) {
                    AlertService.success('Success');
                    $scope.package.preparedDocuments.splice(index, 1);
                };

                var onFailure = function() {
                    AlertService.warn('Failure');
                };

                if (index < $scope.package.preparedDocuments.length && index >= 0) {
                    var preparedDocument = new AccountProductPackageItem($scope.package.preparedDocuments[index]);
                    preparedDocument.$delete({
                        accountId: accountId,
                        productId: productId,
                        packageId: packg._id
                    }, onItemRemoved, onFailure);
                }
            };

            $scope.addLineItem = function() {
                $scope.package.line_items.push({
                    cost: 0,
                    result: 0,
                    description: '',
                    isEfile: true
                });
            };
        })
        .controller('CreateUserAccountReturnCtrl', function($scope, product, AccountProductPackage, $stateParams, AlertService, $location) {
            var accountId = $stateParams.accountId;
            var productId = $stateParams.productId;

            $scope.product = product;
            $scope.package = new AccountProductPackage();

            $scope.removeLineItem = function($index) {
                $scope.package.line_items.splice($index, 1);
            };

            $scope.save = function() {
                $scope.package.$save({
                    accountId: accountId,
                    productId: productId
                }, function(data) {
                    AlertService.success('Successfully saved return');
                    $location.path('/users/accounts/' + accountId + '/products/' + productId + '/returns');
                }, function(data) {
                    AlertService.success('Unable to save return at this time');
                });
            };
        })
        .controller('ContinueQuestionnaireCtrl', function($scope, $modalInstance, category) {
            $scope.category = category;

            $scope.continue = function () {
                $modalInstance.close();
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        })
        .controller('AccountProductCommentsCtrl', function($scope, AccountProductComment, AuthService, FileUploader, QuestionnaireDocument) {
            var createComment = function () {
                return new AccountProductComment({text: '', documents: []});
            };

            $scope.comment = createComment();

            $scope.getTimeAgo = function(created) {
                return moment(created).fromNow();
            };

            $scope.addComment = function() {
                this.comment.$save({accountId: $scope.accountId, productId: $scope.product._id}, function(comment) {
                    $scope.uploader.clearQueue();
                    $scope.product.comments.push(comment);
                    $scope.comment = createComment();
                    $scope.addCommentToTop(comment);
                });
            };

            var questionnaire = $scope.product.questionnaires[0];
            var getFileUploadPath = function() {
                return '/accounts/' + $scope.accountId + '/products/' + $scope.product._id + '/questionnaires/' + questionnaire._id + '/documents';
            };

            var createUploader = function() {
                var headers = {};
                AuthService.addAuthorizationHeader(headers);
                var formData = {};
                AuthService.addJwtToFormData(formData);
                var fileUploader = new FileUploader({
                    url: getFileUploadPath(),
                    formData: [formData],
                    autoUpload: true
                });
                return  fileUploader;
            };

            $scope.uploader = createUploader();

            $scope.uploader.onCompleteAll = function() {
                if (!$scope.comment.text) {
                    var msg = $scope.currentUser.name + " has uploaded a file";
                    if ($scope.comment.documents.length > 1) {
                        msg += 's';
                    }
                    $scope.comment.text = msg;
                }
                questionnaire.documents = QuestionnaireDocument.query({accountId: $scope.accountId, productId: $scope.product._id, questionnaireId: questionnaire._id});
            };
        })
        .controller('ViewUserAccountProductCtrl', function($scope, product, AlertService, $stateParams, $location, $modal, NotificationService, AccountProductNotification) {
            $scope.product = product;
            $scope.accountId = $stateParams.accountId;

            var notification = _.findWhere(product.notifications, {type: 'FTUX_Landing'});
            if (notification && notification.enabled) {
                NotificationService.landing().then(function(disabled) {
                    notification.enabled = !disabled;
                    if (disabled) {
                        var n = new AccountProductNotification(notification);
                        n.$update({
                            accountId: $scope.accountId,
                            productId: product._id
                        }, function() {
                            AlertService.success('Notification preference saved successfully!');
                        }, function() {
                            AlertService.warn('Sorry, an unexpected error occurred, please try again.');
                        });
                    }
                });
            }

            var changeLocationToCategory = function(questionnaire, categoryId) {
                $location.path('/users/accounts/' + $scope.accountId + '/products/' + $scope.product._id + '/questionnaires/' + questionnaire._id + '/categories/' + categoryId);
            };

            // FIXME should load comments from the api
            var offset = 0;
            var numCommentsToShow = 5;
            var commentsToShow = product.comments.slice().reverse();
            $scope.comments = commentsToShow.slice(0, offset + numCommentsToShow);
            $scope.showMoreComments = function() {
                offset += numCommentsToShow;
                $scope.comments = commentsToShow.slice(0, offset + numCommentsToShow);
            };

            $scope.addCommentToTop = function(comment) {
                $scope.comments.splice(0, 0, comment);
                commentsToShow.splice(0, 0, comment);
                offset+=1;
            };

            $scope.hasMoreComments = function() {
                return $scope.comments.length != commentsToShow.length;
            };

            $scope.goToQuestionnaire = function(questionnaire) {
                var categories = _.where(questionnaire.categories, {visible: true});
                var firstCategoryId = categories[0]._id;
                var currentCategoryId = questionnaire.current_category;

                if (questionnaire.status == 'InProgress' && currentCategoryId) {
                    var modal = $modal.open({
                        templateUrl: 'views/modals/continue.html',
                        controller: 'ContinueQuestionnaireCtrl',
                        windowClass: 'small',
                        resolve: {
                            category: function() {
                                return _.findWhere(questionnaire.categories, {_id: currentCategoryId});
                            }
                        }
                    });

                    modal.result.then(function () {
                        changeLocationToCategory(questionnaire, questionnaire.current_category);
                    }, function() {
                        changeLocationToCategory(questionnaire, firstCategoryId);
                    });
                } else {
                    changeLocationToCategory(questionnaire, firstCategoryId);
                }
            };
        })
        .controller('ViewUserAccountQuestionCtrl', function($scope) {
            $scope.$watch('question.triggered_by.length', function(newLen, oldLen) {
                if (newLen != oldLen && newLen === 0) {
                    $scope.question.answer[0].value = [];
                }
            });
        })
        .controller('EditQuestionAnswerCtrl', function($scope) {
            $scope.parse = function() {
                return parseInt($scope.answer.value[0], 10);
            };

            var triggerQuestion = function (question, visible, rule) {
                question.triggered_by = question.triggered_by || [];
                if (visible) {
                    question.triggered_by.push(rule._id);
                } else {
                    question.triggered_by = _.reject(question.triggered_by, function (ruleId) {
                        return ruleId == rule._id;
                    });
                }
            };

            var triggerCategory = function (rule, visible) {
                var category = rule.category;
                var questions = rule.questions;
                var categoryToShow = _.findWhere($scope.questionnaire.categories, {_id: category});
                categoryToShow.visible = visible || categoryToShow._id == $scope.category._id;
                angular.forEach(categoryToShow.questions, function (question) {
                    if (!questions || questions.indexOf(question._id) >= 0) {
                        triggerQuestion(question, visible, rule);
                    }
                });
            };

            var triggerChecklistItem = function(rule, visible) {
                var checklistItemToShow = _.findWhere($scope.questionnaire.checklist, {_id: rule.item});
                checklistItemToShow.triggered_by = checklistItemToShow.triggered_by || [];
                if (visible) {
                    checklistItemToShow.triggered_by.push(rule._id);
                } else {
                    checklistItemToShow.triggered_by = _.reject(checklistItemToShow.triggered_by, function (ruleId) {
                        return ruleId == rule._id;
                    });
                }
            };

            var triggerRuleByValue = function(rules, answer, visible) {
                var rulesToRun = _.where(rules, {value: answer});
                angular.forEach(rulesToRun, function(rule) {
                    if (rule.category) {
                        triggerCategory(rule, visible);
                    } else {
                        triggerChecklistItem(rule, visible);
                    }
                });
            };

            var triggerRules = function(rules, values, visible) {
                angular.forEach(values, function(answer) {
                    triggerRuleByValue(rules, answer, visible);
                });
            };

            $scope.$watch('answer.value', function(newValue, oldValue) {
                var rules = $scope.answer.rules;
                triggerRules(rules, _.difference(newValue, oldValue), true);
                triggerRules(rules, _.difference(oldValue, newValue), false);
            }, true);
        })
        .controller('ChecklistDocumentItemCtrl', function($scope) {
            $scope.showOtherField = false;
            $scope.$watch('documentItem.type.name', function(typeOfCompletedItem, typeOfNotCompletedItem) {
                $scope.markItemAsNotCompleted(typeOfNotCompletedItem);
                $scope.markItemAsCompleted(typeOfCompletedItem);

                if (typeOfNotCompletedItem === 'Other' &&
                    typeOfCompletedItem != typeOfNotCompletedItem) {
                    delete $scope.documentItem.type.value;
                }
            });
        })
        .controller('ChecklistDocumentCtrl', function($scope, AlertService) {
            $scope.editable = $scope.document.editable || false;

            var original = angular.copy($scope.document);

            $scope.edit = function() {
                $scope.editable = true;
            };

            $scope.cancel = function() {
                $scope.editable = false;
                $scope.document.items = original.items;
            };

            var createDocumentItem = function() {
                return {
                    type: '',
                    quantity: 1
                };
            };

            if ($scope.document.items.length === 0) {
                $scope.document.items.push(createDocumentItem());
            }

            $scope.removeDocumentItem = function(index) {
                if ($scope.document.items.length > 1) {
                    $scope.document.items.splice(index, 1);
                }
            };

            $scope.addDocumentItem = function() {
                $scope.document.items.push(createDocumentItem());
            };

            $scope.toggleVerification = function() {
                if ($scope.document.verified) {
                    $scope.document.verified = null;
                } else {
                    $scope.document.verified = new Date();
                }
                this.save();
            };

            var save = function(successMessage) {
                // TODO if a document is approved, don't update it on the backend either
                // ie. dont save the document descriptions on the backend
                $scope.questionnaire.$update({
                    accountId: $scope.accountId,
                    productId: $scope.productId
                }, function(questionnaire) {
                    AlertService.success(successMessage);
                    $scope.questionnaire = questionnaire;
                }, function(res) {
                    AlertService.warn('Unable to save at this time, please try again.');
                });
            };

            $scope.save = function() {
                save('Successfully saved');
            };
        })
        .controller('UploadChecklistItemFile', function($scope, $http, FileUploader, AuthService, NotificationService) {
            var getFileUploadPath = function() {
                return '/accounts/' + $scope.accountId + '/products/' + $scope.productId + '/questionnaires/' + $scope.questionnaireId + '/documents';
            };

            var createUploader = function() {
                var headers = {};
                AuthService.addAuthorizationHeader(headers);
                return new FileUploader({
                    url: getFileUploadPath(),
                    headers: headers,
                    autoUpload: true
                });
            };

            $scope.uploader = createUploader();
            $scope.uploader.onSuccessItem = function(fileItem, response) {
                $scope.questionnaire.documents = response;
                NotificationService.checklistItemUploaded();
                _.last($scope.questionnaire.documents).editable = true;
            };
        })
        .controller('ViewUserAccountChecklistCtrl', function($scope, $stateParams, questionnaire, $http, AlertService, _, ModalService, $location) {
            $scope.accountId = $stateParams.accountId;
            $scope.productId = $stateParams.productId;
            $scope.questionnaire = questionnaire;
            $scope.questionnaireId = $stateParams.questionnaireId;
            $scope.categories = questionnaire.categories;
            $scope.checklist = questionnaire.checklist;
            $scope.previousCategories = _.where(questionnaire.categories, {visible: true}).reverse();

            var checklistTally = {};

            $scope.markItemAsCompleted = function(type) {
                if (type) {
                    if (!checklistTally.hasOwnProperty(type)) {
                        checklistTally[type] = 0;
                    }
                    checklistTally[type]++;

                    setItemCompletedByType(type, true);
                }
            };

            $scope.markItemAsNotCompleted = function(type) {
                if (type) {
                    if (checklistTally[type] > 0) {
                        checklistTally[type]--;
                    }

                    if (checklistTally[type] === 0) {
                        setItemCompletedByType(type, false);
                    }
                }
            };

            function setItemCompletedByType(name, completed) {
                completed = completed || false;
                var item = _.findWhere($scope.checklist, {name: name});
                if (item) {
                    item.completed = completed;
                }
            }

            // TODO this is similar to the questionaire save, use a service
            var save = function(successMessage) {
                $scope.questionnaire.$update({
                    accountId: $scope.accountId,
                    productId: $scope.productId
                }, function(questionnaire) {
                    AlertService.success(successMessage);
                    $scope.questionnaire = questionnaire;
                }, function(res) {
                    AlertService.warn('Unable to save at this time, please try again.');
                });
            };

            $scope.submit = function() {
                var message = "By choosing ready to submit you are giving TAXplan consent to begin your tax return. Are you sure you are ready to submit?";
                var title = "Confirm Action";

                var modal = ModalService.confirm(title, message);

                modal.result.then(function (confirmed) {
                    if (confirmed) {
                        $scope.questionnaire.submitted_documents_on = new Date();
                        save('Successfully submitted');
                        var infoModal = ModalService.info("Thank you for submitting your documents.  A TAXplan TAXpro will now begin preparing your return.");
                        infoModal.result.then(function () {
                            $location.path('/users/accounts/' + $scope.accountId + '/products/' + $scope.productId);
                        });
                    }
                });
            };

            var getDocumentPath = function(document) {
                return '/accounts/' + $scope.accountId + '/products/' + $scope.productId + '/questionnaires/' + $scope.questionnaireId + '/documents/' + document._id;
            };

            $scope.removeDocument = function(document) {
                $http({method: 'DELETE', url: getDocumentPath(document)}).
                    success(function() {
                        var indexOfDocument = _.indexOf($scope.questionnaire.documents, document);
                        $scope.questionnaire.documents.splice(indexOfDocument, 1);
                        AlertService.success("Successfully removed");
                    }).
                    error(function(data, status, headers, config) {
                        AlertService.warn("Couldn't remove the document at this time. Please try again.");
                    });

            };
        })
        .controller('ViewUserAccountQuestionnaireCategoryCtrl', function($scope, questionnaire, $location, $stateParams, _, AlertService, ModalService) {
            var categoryId = $stateParams.categoryId;
            var accountId = $stateParams.accountId;
            var productId = $stateParams.productId;
            var questionnaireId = $stateParams.questionnaireId;
            var categoryIndex = 0;
            var categories = _.where(questionnaire.categories, {visible: true});

            $scope.questionnaire = questionnaire;

            $scope.accountId = accountId;
            $scope.productId = productId;

            var findCategoryById = function(categoryId) {
                return _.findWhere(categories, {_id: categoryId});
            };

            // TODO pull out into a separate encapsulated object
            var showCategory = function(index) {
                if (index >= 0 && index < categories.length) {
                    $scope.category = categories[index];
                    $scope.previousCategories = categories.slice(0, index);
                    $scope.firstCategory = index === 0;
                    $scope.lastCategory = categories.length === (index + 1);
                }
            };

            var getCategory = function(index) {
                var categories = _.where(questionnaire.categories, {visible: true});

                var category;
                if (index >= 0 && index < categories.length) {
                    category = categories[index];
                }
                return category;
            };

            var goToCategory = function(index) {
                var category = getCategory(index);
                if (category) {
                    $location.path('/users/accounts/' + accountId + '/products/' + productId + '/questionnaires/' + questionnaireId + '/categories/' + category._id);
                }
            };

            var doGoToNextCategory = function() {
                goToCategory(categoryIndex + 1);
            };

            var getProgressImageUrl = function(progressImage) {
                return '/products/' + productId + '/questionnaires/' + $scope.questionnaire._id + '/categories/' + $scope.category._id + '/progress/' + progressImage._id;
            };

            var goToNextCategory = function() {
                if ($scope.category.progress.length === 1) {
                    var progressImage = $scope.category.progress[0];
                    ModalService.questionnaireProgress(getProgressImageUrl(progressImage)).result.then(function() {
                        doGoToNextCategory();
                    });
                } else {
                    doGoToNextCategory();
                }
            };

            var category = findCategoryById(categoryId);
            if (category) {
                categoryIndex = _.indexOf(categories, category);
            }
            showCategory(categoryIndex);

            $scope.isEditable = function() {
                return $scope.questionnaire.status == 'NotStarted' ||
                    $scope.questionnaire.status == 'InProgress';
            };

            var save = function(callback, next) {
                next = next || false;
                if (next) {
                    var category = getCategory(categoryIndex + 1);
                    if (category) {
                        questionnaire.current_category = category._id;
                    }
                }

                questionnaire.$update({
                    accountId: accountId,
                    productId: productId
                }, function() {
                    callback.success();
                }, function() {
                    AlertService.warn('Failed to save, please try again');
                });
            };

            var goToChecklist = function() {
                $location.path('/users/accounts/' + accountId + '/products/' + productId + '/questionnaires/' + $scope.questionnaire._id + '/checklist');
            };

            var showFinishedQuestionnaireModal = function() {
                var modal = ModalService.info("Thank you for completing your TAXprofile. Please proceed to Step # 2 on your TAXreturn Dashboard to access your checklist items.");
                modal.result.then(function () {
                    $location.path('/users/accounts/' + accountId + '/products/' + productId);
                });
            };

            var finishQuestionnaire = function() {
                $scope.questionnaire.status = 'Finished';
                save({
                    success: function() {
                        AlertService.success('Successfully saved');
                        showFinishedQuestionnaireModal();
                    }
                }, false);
            };

            $scope.finish = function() {
                if (!this.isEditable()) {
                    goToChecklist();
                } else {
                    finishQuestionnaire();
                }
            };

            $scope.next = function() {
                if (!this.isEditable()) {
                    goToNextCategory();
                } else {
                    save({
                        success: function() {
                            AlertService.success('Successfully saved');
                            goToNextCategory();
                        }
                    }, true);
                }
            };

            $scope.save = function() {
                save({
                    success: function() {
                        AlertService.success('Successfully saved');
                    }
                });
            };

        })
        .controller('ViewUserAccountCtrl', function($scope, $stateParams, account, Product, AccountProduct, AlertService, $location, _) {
            $scope.account = account;
            var accountId = $stateParams.accountId;
            $scope.accountId = accountId;

            var goToProduct = function(product) {
                $location.path('/users/accounts/' + accountId + '/products/' + product._id);
            };

            var addProductTo = function(account) {
                Product.query(function(products) {
                    var product = products[0];
                    var accountProduct = new AccountProduct(product);
                    accountProduct.$save({
                        accountId: accountId
                    }, function(product) {
                        account.products.push(product);
                        goToProduct(product);
                    }, function(data) {
                        // TODO
                    });
                });
            };


            if (account.products.length === 0) {
                addProductTo(account);
            } else {
                goToProduct(account.products[0]);
            }

        })
        .controller('ListAccountsCtrl', function($scope, $location) {
            if ($scope.currentUser.role != 'Admin') {
                $location.path('/users/accounts');
            }
        })
        .controller('ViewAccountCtrl', function ($scope, Account, $stateParams) {
            Account.get({
                accountId: $stateParams.accountId
            }, function(account) {
                $scope.account = account;
            });
        });
})();