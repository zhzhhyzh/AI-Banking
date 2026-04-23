"""
Agent Orchestrator - FastAPI Application
The "Brain" that connects the React UI to the Spring Boot Banking Core via an AI Agent.
"""

import uuid
from typing import Optional, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agent.orchestrator import run_agent
from services.banking_client import BankingClient
from services.auth_service import store_session, get_session

app = FastAPI(
    title="JavaBank Agent Orchestrator",
    description="AI-powered banking agent that orchestrates between users and the Banking Core API",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Request / Response Models ----------

class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    phone: Optional[str] = None


class SendVerificationRequest(BaseModel):
    email: str


class VerifyEmailRequest(BaseModel):
    email: str
    code: str


class AuthResponse(BaseModel):
    token: str
    username: str
    user_id: int
    session_id: str


class ChatRequest(BaseModel):
    message: str
    session_id: str


class ActionCard(BaseModel):
    type: str  # "confirm_transfer" | "account_created" | "risk_warning"
    data: dict


class ChatResponse(BaseModel):
    response: str
    action_cards: List[ActionCard] = []


# ---------- Endpoints ----------

@app.post("/auth/send-verification")
async def send_verification(request: SendVerificationRequest):
    """Send a 6-digit verification code to the user's email."""
    client = BankingClient()
    try:
        result = await client.send_verification(email=request.email)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


@app.post("/auth/verify-email")
async def verify_email(request: VerifyEmailRequest):
    """Verify the 6-digit code sent to the user's email."""
    client = BankingClient()
    try:
        result = await client.verify_email(email=request.email, code=request.code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


@app.post("/auth/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    """Register a new user via Spring Boot, store session, return token."""
    client = BankingClient()
    try:
        result = await client.register(
            username=request.username,
            email=request.email,
            password=request.password,
            phone=request.phone,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    session_id = str(uuid.uuid4())
    store_session(session_id, result["token"], result["username"], result["userId"])

    return AuthResponse(
        token=result["token"],
        username=result["username"],
        user_id=result["userId"],
        session_id=session_id,
    )


@app.post("/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Login via Spring Boot, store session, return token."""
    client = BankingClient()
    try:
        result = await client.login(request.username, request.password)
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    session_id = str(uuid.uuid4())
    store_session(session_id, result["token"], result["username"], result["userId"])

    return AuthResponse(
        token=result["token"],
        username=result["username"],
        user_id=result["userId"],
        session_id=session_id,
    )


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message to the AI agent and get a response with optional action cards."""
    session = get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")

    result = await run_agent(
        message=request.message,
        session_id=request.session_id,
        token=session["token"],
    )

    action_cards = [
        ActionCard(type=card["type"], data=card["data"])
        for card in result.get("action_cards", [])
    ]

    return ChatResponse(
        response=result["response"],
        action_cards=action_cards,
    )


@app.get("/health")
async def health():
    return {"status": "ok", "service": "agent-orchestrator"}
