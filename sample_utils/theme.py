import streamlit as st

def apply_custom_theme():
    """
    Injects custom CSS styling for a vibrant, lightly dark glassmorphic UI,
    modern typography, responsive mobile-first layouts, and animated buttons.
    """
    custom_css = """
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        /* Global Font & Smooth Scroll */
        html, body, [class*="css"] {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif !important;
        }

        /* App Background & Padding */
        .stApp {
            background: linear-gradient(135deg, #0b0f19 0%, #0f172a 50%, #111827 100%) !important;
            color: #f8fafc !important;
        }

        /* Header styling */
        h1, h2, h3, h4, h5, h6 {
            font-family: 'Plus Jakarta Sans', sans-serif !important;
            font-weight: 800 !important;
            letter-spacing: -0.025em !important;
            color: #ffffff !important;
        }

        h1 {
            background: linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-size: 2.25rem !important;
            margin-bottom: 0.5rem !important;
        }

        /* Sidebar Styling */
        [data-testid="stSidebar"] {
            background-color: rgba(15, 23, 42, 0.95) !important;
            border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
            backdrop-filter: blur(16px) !important;
        }

        /* Glassmorphic Metric Cards */
        [data-testid="stMetric"] {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%) !important;
            border: 1px solid rgba(255, 255, 255, 0.12) !important;
            border-radius: 16px !important;
            padding: 16px 20px !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3) !important;
            backdrop-filter: blur(12px) !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        [data-testid="stMetric"]:hover {
            transform: translateY(-4px) scale(1.02);
            border-color: rgba(99, 102, 241, 0.5) !important;
            box-shadow: 0 20px 25px -5px rgba(99, 102, 241, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.3) !important;
        }

        [data-testid="stMetricValue"] {
            font-weight: 800 !important;
            font-size: 2rem !important;
            background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        [data-testid="stMetricLabel"] {
            font-weight: 600 !important;
            color: #94a3b8 !important;
            font-size: 0.9rem !important;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        /* Buttons with Gradient & Hover Micro-animations */
        .stButton > button {
            border-radius: 12px !important;
            font-weight: 700 !important;
            font-size: 0.95rem !important;
            padding: 12px 24px !important;
            transition: all 0.25s ease-in-out !important;
            border: none !important;
            width: 100% !important;
        }

        /* Primary Button */
        .stButton > button[kind="primary"] {
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.4) !important;
        }

        .stButton > button[kind="primary"]:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px 0 rgba(99, 102, 241, 0.6) !important;
            background: linear-gradient(135deg, #818cf8 0%, #6366f1 100%) !important;
        }

        /* Secondary Button */
        .stButton > button[kind="secondary"] {
            background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 4px 14px 0 rgba(14, 165, 233, 0.3) !important;
        }

        .stButton > button[kind="secondary"]:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px 0 rgba(14, 165, 233, 0.5) !important;
        }

        /* Expander styling */
        .stExpander {
            background: rgba(30, 41, 59, 0.5) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            border-radius: 14px !important;
            margin-bottom: 12px !important;
        }

        /* Input fields & Selectboxes */
        .stTextInput > div > div > input,
        .stSelectbox > div > div > div,
        .stNumberInput > div > div > input {
            background-color: rgba(15, 23, 42, 0.7) !important;
            color: #f8fafc !important;
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
            border-radius: 10px !important;
        }

        .stTextInput > div > div > input:focus,
        .stSelectbox > div > div > div:focus {
            border-color: #6366f1 !important;
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3) !important;
        }

        /* File Uploader Container */
        [data-testid="stFileUploader"] {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%) !important;
            border: 2px dashed rgba(99, 102, 241, 0.4) !important;
            border-radius: 16px !important;
            padding: 20px !important;
            transition: border-color 0.3s ease !important;
        }

        [data-testid="stFileUploader"]:hover {
            border-color: #38bdf8 !important;
        }

        /* Toast Notifications */
        div[data-baseweb="toast"] {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%) !important;
            border: 1px solid rgba(99, 102, 241, 0.4) !important;
            border-radius: 12px !important;
            color: #f8fafc !important;
        }

        /* Dividers */
        hr {
            border-color: rgba(255, 255, 255, 0.08) !important;
            margin: 1.5rem 0 !important;
        }

        /* Mobile Responsive Adjustments */
        @media (max-width: 768px) {
            h1 {
                font-size: 1.75rem !important;
            }
            .stApp {
                padding: 10px !important;
            }
            [data-testid="stMetric"] {
                padding: 12px 14px !important;
                margin-bottom: 10px !important;
            }
            [data-testid="stMetricValue"] {
                font-size: 1.5rem !important;
            }
            .stButton > button {
                padding: 10px 16px !important;
            }
        }
    </style>
    """
    st.markdown(custom_css, unsafe_allow_html=True)
