var postageapp = null;
var config = require('../../config/config');

if (process.env.NODE_ENV == 'test') {

} else {
    postageapp = require('postageapp')(config.postageapp.api_key);
}

exports.send = function(template, recipient, variables, callback) {
    if (postageapp) {
        var onSuccess = function(response, object) {
            if (callback && callback.success) {
                callback.success(response, object);
            }
        };

        var onError = function(response, object) {
            if (callback && callback.error) {
                callback.error(response, object);
            }
        };

        var options = {
            recipients: recipient,
            template: template
        };
        if (variables) {
            options.variables = variables;
        }
        postageapp.sendMessage(options, onSuccess, onError);
    }
};
