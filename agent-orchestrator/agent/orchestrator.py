"""
Agent Orchestrator - LangChain agent with Ollama/Groq LLM and banking tools.
"""

import json
from typing import Optional

from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage

from agent.prompts import SYSTEM_PROMPT
from agent.tools import ALL_TOOLS, set_banking_client
from services.banking_client import BankingClient
from services.auth_service import get_chat_history, store_chat_history
from config import settings


def _get_llm():
    """Create the LLM instance based on configured provider."""
    if settings.llm_provider == "groq":
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=settings.groq_model,
            api_key=settings.groq_api_key,
            temperature=0.1,
        )
    else:
        from langchain_ollama import ChatOllama
        return ChatOllama(
            model=settings.ollama_model,
            base_url=settings.ollama_base_url,
            temperature=0.1,
        )


def _build_agent() -> AgentExecutor:
    """Build the LangChain agent with configured LLM and banking tools."""
    llm = _get_llm()

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    agent = create_tool_calling_agent(llm, ALL_TOOLS, prompt)

    return AgentExecutor(
        agent=agent,
        tools=ALL_TOOLS,
        verbose=True,
        handle_parsing_errors=True,
        max_iterations=5,
        return_intermediate_steps=True,
    )


async def run_agent(
    message: str,
    session_id: str,
    token: str,
) -> dict:
    """
    Run the banking agent for a user message.

    Returns:
        dict with keys: response (str), action_cards (list)
    """
    # Set up the banking client with user's token
    client = BankingClient(token=token)
    set_banking_client(client)

    # Load conversation history from Redis
    history_raw = get_chat_history(session_id)
    chat_history = []
    for msg in history_raw[-20:]:  # Keep last 20 messages for context
        if msg["role"] == "user":
            chat_history.append(HumanMessage(content=msg["content"]))
        else:
            chat_history.append(AIMessage(content=msg["content"]))

    # Build and run the agent
    agent_executor = _build_agent()

    try:
        result = await agent_executor.ainvoke({
            "input": message,
            "chat_history": chat_history,
        })

        response_text = result.get("output", "I apologize, I couldn't process that request.")

        # Extract action cards from intermediate steps
        action_cards = _extract_action_cards(result.get("intermediate_steps", []))

    except Exception as e:
        response_text = f"I encountered an issue processing your request: {str(e)}. Please try again."
        action_cards = []

    # Update conversation history
    history_raw.append({"role": "user", "content": message})
    history_raw.append({"role": "assistant", "content": response_text})
    store_chat_history(session_id, history_raw)

    return {
        "response": response_text,
        "action_cards": action_cards,
    }


def _extract_action_cards(intermediate_steps: list) -> list:
    """Extract action cards from agent's intermediate steps (tool outputs)."""
    action_cards = []
    for step in intermediate_steps:
        if len(step) >= 2:
            tool_output = step[1]
            try:
                data = json.loads(tool_output) if isinstance(tool_output, str) else tool_output
                if isinstance(data, dict) and "action_card" in data:
                    action_cards.append(data["action_card"])
            except (json.JSONDecodeError, TypeError):
                pass
    return action_cards
