import httpx
from typing import Optional
from config import settings


class BankingApiError(Exception):
    """Raised when the Spring Boot Banking Core returns a non-2xx response.
    Carries the upstream status code and parsed error message so the
    FastAPI layer can surface them to the UI verbatim."""

    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def _raise_for_status(resp: httpx.Response) -> None:
    """Replace httpx's generic raise_for_status with one that extracts
    the Spring Boot GlobalExceptionHandler JSON body ({status, message, timestamp})
    and exposes a meaningful message."""
    if resp.is_success:
        return
    message: str
    try:
        body = resp.json()
        if isinstance(body, dict):
            message = body.get("message") or body.get("error") or body.get("detail") or resp.text
        else:
            message = resp.text or f"HTTP {resp.status_code}"
    except Exception:
        message = resp.text or f"HTTP {resp.status_code}"
    raise BankingApiError(resp.status_code, message.strip())


class BankingClient:
    """Async HTTP client that wraps every Spring Boot Banking Core endpoint."""

    def __init__(self, token: Optional[str] = None):
        self.base_url = settings.banking_core_url
        self.token = token

    def _headers(self) -> dict:
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    async def register(self, username: str, email: str, password: str, phone: str = None) -> dict:
        async with httpx.AsyncClient() as client:
            payload = {"username": username, "email": email, "password": password}
            if phone:
                payload["phone"] = phone
            resp = await client.post(
                f"{self.base_url}/auth/register",
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            _raise_for_status(resp)
            return resp.json()

    async def send_verification(self, email: str) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/auth/send-verification",
                json={"email": email},
                headers={"Content-Type": "application/json"},
            )
            _raise_for_status(resp)
            return resp.json()

    async def verify_email(self, email: str, code: str) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/auth/verify-email",
                json={"email": email, "code": code},
                headers={"Content-Type": "application/json"},
            )
            _raise_for_status(resp)
            return resp.json()

    async def login(self, username: str, password: str) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/auth/login",
                json={"username": username, "password": password},
                headers={"Content-Type": "application/json"},
            )
            _raise_for_status(resp)
            return resp.json()

    async def create_account(self, account_type: str, currency: str = "USD") -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/accounts",
                json={"accountType": account_type, "currency": currency},
                headers=self._headers(),
            )
            _raise_for_status(resp)
            return resp.json()

    async def get_accounts(self) -> list:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/accounts",
                headers=self._headers(),
            )
            _raise_for_status(resp)
            return resp.json()

    async def get_account(self, account_id: int) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/accounts/{account_id}",
                headers=self._headers(),
            )
            _raise_for_status(resp)
            return resp.json()

    async def transfer_funds(
        self,
        from_account_id: int,
        to_account_id: int,
        amount: float,
        currency: str = "USD",
        description: str = None,
        risk_level: str = None,
        agent_reasoning: str = None,
    ) -> dict:
        async with httpx.AsyncClient() as client:
            payload = {
                "fromAccountId": from_account_id,
                "toAccountId": to_account_id,
                "amount": amount,
                "currency": currency,
            }
            if description:
                payload["description"] = description
            if risk_level:
                payload["riskLevel"] = risk_level
            if agent_reasoning:
                payload["agentReasoning"] = agent_reasoning

            resp = await client.post(
                f"{self.base_url}/transactions/transfer",
                json=payload,
                headers=self._headers(),
            )
            _raise_for_status(resp)
            return resp.json()

    async def confirm_transfer(self, transaction_id: int) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/transactions/{transaction_id}/confirm",
                headers=self._headers(),
            )
            _raise_for_status(resp)
            return resp.json()

    async def get_transactions(self) -> list:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/transactions",
                headers=self._headers(),
            )
            _raise_for_status(resp)
            return resp.json()
