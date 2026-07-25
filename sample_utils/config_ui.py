import streamlit as st

def render_config_sidebar():
    """
    Renders notification and MongoDB Atlas settings in the Streamlit sidebar
    and returns a configuration dictionary.
    """
    st.sidebar.markdown("---")
    st.sidebar.subheader("⚙️ Incident Alert & DB Settings")

    with st.sidebar.expander("📧 Email Notification Settings", expanded=False):
        enable_email = st.checkbox("Enable Email Alerts", value=st.session_state.get("enable_email", False))
        smtp_server = st.text_input("SMTP Server", value=st.session_state.get("smtp_server", "smtp.gmail.com"))
        smtp_port = st.number_input("SMTP Port", value=int(st.session_state.get("smtp_port", 587)), step=1)
        sender_email = st.text_input("Sender Email", value=st.session_state.get("sender_email", ""), placeholder="your.email@gmail.com")
        sender_password = st.text_input("Sender App Password", value=st.session_state.get("sender_password", ""), type="password", help="For Gmail, use 16-character App Password")
        receiver_email = st.text_input("Recipient Email (Office/Admin)", value=st.session_state.get("receiver_email", ""), placeholder="office@authority.gov")

    with st.sidebar.expander("🍃 MongoDB Atlas Settings", expanded=False):
        enable_mongo = st.checkbox("Enable MongoDB Logging", value=st.session_state.get("enable_mongo", False))
        mongo_uri = st.text_input("MongoDB Atlas URI", value=st.session_state.get("mongo_uri", ""), type="password", placeholder="mongodb+srv://user:pass@cluster.mongodb.net/...")
        mongo_db = st.text_input("Database Name", value=st.session_state.get("mongo_db", "road_damage_db"))
        mongo_coll = st.text_input("Collection Name", value=st.session_state.get("mongo_coll", "incidents"))

    # Save to session_state
    st.session_state["enable_email"] = enable_email
    st.session_state["smtp_server"] = smtp_server
    st.session_state["smtp_port"] = smtp_port
    st.session_state["sender_email"] = sender_email
    st.session_state["sender_password"] = sender_password
    st.session_state["receiver_email"] = receiver_email
    
    st.session_state["enable_mongo"] = enable_mongo
    st.session_state["mongo_uri"] = mongo_uri
    st.session_state["mongo_db"] = mongo_db
    st.session_state["mongo_coll"] = mongo_coll

    return {
        "enable_email": enable_email,
        "smtp_server": smtp_server,
        "smtp_port": smtp_port,
        "sender_email": sender_email,
        "sender_password": sender_password,
        "receiver_email": receiver_email,
        "enable_mongo": enable_mongo,
        "mongo_uri": mongo_uri,
        "mongo_db": mongo_db,
        "mongo_coll": mongo_coll
    }
