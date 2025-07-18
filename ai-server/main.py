import os
from pydantic import BaseModel, Field
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from dotenv import load_dotenv

# --- Load environment variables ---
load_dotenv()
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
if not NVIDIA_API_KEY:
    print("ERROR: NVIDIA_API_KEY not found in environment or .env file.")

# --- 1. Initialize FastAPI App ---
app = FastAPI(
    title="CodeBros AI Assistant",
    description="An API that uses an LLM to analyze and refactor code collaboratively.",
    version="1.0.0"
)

# --- FIX 1: Add CORS Middleware ---
# This allows your frontend (running on localhost:3000) to make requests to this server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # The origin of your Next.js app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- FIX 2: Define Correct API Data Structures ---
# This model now matches the JSON sent from Chat.js
class CodeContext(BaseModel):
    fileName: str
    code: str
    language: str

class CodeAnalysisRequest(BaseModel):
    """Represents the data received from the frontend."""
    message: str = Field(description="The natural language query from the user about the code.")
    context: CodeContext = Field(description="The context of the code file being analyzed.")

# This Pydantic model defines the exact JSON format we want the LLM to return.
class CodeAnalysisResponse(BaseModel):
    """The structured response from the LLM after analyzing the code."""
    suggestion: str = Field(description="A clear, concise explanation of the changes made or suggestions for the code.")
    edited_code: str | None = Field(default=None, description="The complete, modified code with the suggestions applied.")

# --- 3. The Core Processing Logic ---
def process_code_analysis_request(request_data: dict):
    """
    This function contains the core logic for processing the request.
    It uses LangChain to prompt an LLM and parse the response.
    """
    print("--- Setting up LangChain with Pydantic Output Parser ---")
    llm = ChatOpenAI(
        model="meta/llama3-70b-instruct", 
        temperature=0.2,
        api_key=NVIDIA_API_KEY,
        base_url="https://integrate.api.nvidia.com/v1"
    )

    output_parser = PydanticOutputParser(pydantic_object=CodeAnalysisResponse)

    system_prompt = """
    You are an expert code analysis and refactoring assistant.
    Your task is to receive a user's query about a piece of code, analyze it,
    and provide a suggestion along with the edited code if applicable.
    You MUST respond in the JSON format specified. Do not add any extra text or explanations outside of the JSON structure.
    The value for "edited_code" MUST be a valid JSON string, with all newlines and special characters properly escaped (e.g., using \\n for newlines).
    If no code edits are necessary (e.g., the user is just asking a question), the value for "edited_code" should be null.
    """

    user_prompt_template = """
    User Query: {user_query}

    --- START OF CODE FILE ({file_name}) ---
    {code_file_content}
    --- END OF CODE FILE ---

    {format_instructions}
    """

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", user_prompt_template)
    ])

    chain = prompt | llm | output_parser

    print("--- Invoking the LLM and Parsing the Response ---")
    try:
        # FIX 3: Extract data from the corrected request structure
        response = chain.invoke({
            "user_query": request_data["message"],
            "file_name": request_data["context"]["fileName"],
            "code_file_content": request_data["context"]["code"],
            "format_instructions": output_parser.get_format_instructions()
        })
        print("Successfully received and parsed structured response from LLM.")
        return response.model_dump()

    except Exception as e:
        print(f"An error occurred while invoking the LLM or parsing the response: {e}")
        return {
            "suggestion": "Sorry, I had trouble processing that request. Please try again.",
            "edited_code": None
        }

# --- 4. Define the Webhook Endpoint ---
@app.post("/analyze-code", response_model=CodeAnalysisResponse)
def handle_code_analysis(request: CodeAnalysisRequest):
    """
    This is the webhook endpoint. It receives a POST request with a JSON body
    that matches the CodeAnalysisRequest model.
    """
    print("--- Webhook endpoint /analyze-code received a request ---")
    request_data = request.model_dump()
    response = process_code_analysis_request(request_data)
    return response

# To run this server:
# 1. Save the file as `main.py`.
# 2. Install necessary packages: `pip install "fastapi[all]" langchain-openai pydantic python-dotenv`
# 3. Create a `.env` file in the same directory with your NVIDIA_API_KEY.
# 4. Run from your terminal: `uvicorn main:app --reload --port 3001`
# 5. The API will be available at http://127.0.0.1:3001/docs for interactive testing.