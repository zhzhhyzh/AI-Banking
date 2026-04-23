"""
LangChain tool definitions for the Banking AI Agent.
Each tool wraps a Spring Boot API call or the risk ML model.
"""

import asyncio
import json
from datetime import datetime
from langchain_core.tools import tool

from services.banking_client import BankingClient
from models.risk_model import assess_risk

# Global reference to the banking client - set per request
_current_client: BankingClient = None


def set_banking_client(client: BankingClient):
    """Set the banking client for the current request context."""
    global _current_client
    _current_client = client


def _get_client() -> BankingClient:
    if _current_client is None:
        raise RuntimeError("Banking client not initialized. User must be logged in.")
    return _current_client


def _run_async(coro):
    """Helper to run async code from sync tool functions."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            return pool.submit(asyncio.run, coro).result()
    else:
        return asyncio.run(coro)


@tool
def create_account_tool(account_type: str, currency: str = "USD") -> str:
    """Create a new bank account. Account types: CHECKING, SAVINGS, HIGH_YIELD_SAVINGS. Returns the new account details."""
    client = _get_client()
    try:
        result = _run_async(client.create_account(account_type.upper(), currency))
        return json.dumps({
            "status": "success",
            "action_card": {
                "type": "account_created",
                "data": result,
            },
            "message": f"Successfully created a {account_type} account! Account number: {result['accountNumber']}, "
                       f"Balance: ${result['balance']:.2f} {result['currency']}",
        })
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


@tool
def get_accounts_tool() -> str:
    """Get all bank accounts for the current user. Returns a list of accounts with balances."""
    client = _get_client()
    try:
        accounts = _run_async(client.get_accounts())
        if not accounts:
            return json.dumps({"status": "success", "message": "You don't have any accounts yet. Would you like to open one?"})

        summary = []
        for acc in accounts:
            summary.append(
                f"- {acc['accountType']} ({acc['accountNumber']}): "
                f"${acc['balance']:.2f} {acc['currency']} [{acc['status']}]"
            )
        return json.dumps({
            "status": "success",
            "accounts": accounts,
            "message": "Here are your accounts:\n" + "\n".join(summary),
        })
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


@tool
def transfer_funds_tool(
    from_account_id: int,
    to_account_id: int,
    amount: float,
    recipient_name: str = "Unknown",
    description: str = "",
) -> str:
    """Transfer money between accounts. Automatically runs risk assessment first. 
    If risk is HIGH, the transfer will be flagged and require confirmation."""
    client = _get_client()

    # Step 1: Run risk assessment
    is_new = recipient_name.lower() not in ["self", "me", "my account", "own"]
    now = datetime.now()

    risk_result = assess_risk(
        amount=amount,
        is_new_recipient=is_new,
        transaction_frequency=10,  # default for demo
        hour_of_day=now.hour,
        country_risk_score=0.3,  # default for demo
    )

    risk_level = risk_result["risk_level"]
    reasoning = f"Risk assessment: {risk_level} (confidence: {risk_result['confidence']}). Factors: {', '.join(risk_result['reasons'])}"

    try:
        result = _run_async(client.transfer_funds(
            from_account_id=from_account_id,
            to_account_id=to_account_id,
            amount=amount,
            description=description or f"Transfer to {recipient_name}",
            risk_level=risk_level,
            agent_reasoning=reasoning,
        ))

        if result.get("status") == "FLAGGED":
            return json.dumps({
                "status": "flagged",
                "action_card": {
                    "type": "confirm_transfer",
                    "data": {
                        "transaction_id": result["id"],
                        "amount": amount,
                        "recipient_name": recipient_name,
                        "risk_level": risk_level,
                        "risk_reasons": risk_result["reasons"],
                        "from_account": result.get("fromAccountNumber"),
                        "to_account": result.get("toAccountNumber"),
                    },
                },
                "message": f"This transfer has been flagged as {risk_level} risk.\n"
                           f"Reasons: {', '.join(risk_result['reasons'])}\n"
                           f"Transaction ID: {result['id']}\n"
                           f"Please confirm to proceed or cancel.",
            })

        return json.dumps({
            "status": "success",
            "message": f"Transfer of ${amount:.2f} completed successfully! "
                       f"Transaction ID: {result['id']}, Status: {result['status']}",
        })
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


@tool
def confirm_transfer_tool(transaction_id: int) -> str:
    """Confirm a previously flagged high-risk transaction. Use this after the user explicitly confirms they want to proceed."""
    client = _get_client()
    try:
        result = _run_async(client.confirm_transfer(transaction_id))
        return json.dumps({
            "status": "success",
            "message": f"Transaction {transaction_id} confirmed and executed! "
                       f"Status: {result['status']}, Amount: ${result['amount']:.2f}",
        })
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


@tool
def risk_assessment_tool(
    amount: float,
    is_new_recipient: bool = True,
    transaction_frequency: int = 10,
    hour_of_day: int = 12,
    country_risk_score: float = 0.3,
) -> str:
    """Assess the risk level of a potential transaction without executing it. 
    Returns risk level (LOW/MEDIUM/HIGH) with confidence and reasoning."""
    result = assess_risk(
        amount=amount,
        is_new_recipient=is_new_recipient,
        transaction_frequency=transaction_frequency,
        hour_of_day=hour_of_day,
        country_risk_score=country_risk_score,
    )

    return json.dumps({
        "status": "success",
        "action_card": {
            "type": "risk_warning",
            "data": result,
        },
        "message": f"Risk Assessment Result:\n"
                   f"- Level: {result['risk_level']}\n"
                   f"- Confidence: {result['confidence']:.1%}\n"
                   f"- Factors: {', '.join(result['reasons'])}",
    })


# List of all available tools
ALL_TOOLS = [
    create_account_tool,
    get_accounts_tool,
    transfer_funds_tool,
    confirm_transfer_tool,
    risk_assessment_tool,
]
