var sasl = require('./sasl');
var sys = require('sys');

function callback(property, session) {
    // since realm is not currently set above
    if( property == sasl.GSASL_REALM ) {
        session.setProperty("realm", "MyHomePage");
        return sasl.GSASL_OK;
    }

    if( property == sasl.GSASL_PASSWORD ) {
        // get password for user, using property()
        var pass = getPassword(session.property('authid'));
        session.setProperty('password', pass);
        return sasl.GSASL_OK;
    }
    
    if( property == sasl.GSASL_USERNAME ) {
        // get password for user, using property()
        var pass = getPassword(session.property('authid'));
        session.setProperty('username', pass);
        return sasl.GSASL_OK;
    }
}


sasl_conn = sasl.createServerSession("realm", callback);
sasl_conn.start("DIGEST-MD5");
sys.debug( sys.inspect( sasl_conn ) );
sys.debug( sasl_conn.property("realm") );
sasl_conn.setProperty("realm", "localhost");
sys.debug( sasl_conn.property("realm") );
sys.debug( sys.inspect(sasl));
//sys.debug( sys.inspect( sasl ) );