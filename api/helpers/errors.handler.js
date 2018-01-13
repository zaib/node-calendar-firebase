module.exports = {
    usernameError: {
        status: 404,
        message: 'username not found or username is not passed as a parameter.'
    },
    notFound: {
        status: 404,
        message: 'record not found.'
    },
    googleAuthError: {
        status: 400,
        message: 'Google access token error.'
    },
    requiredParamMissing: {
        status: 500,
        message: 'required paramaeter is missing.'
    }    
};