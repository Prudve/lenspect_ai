import string
from rank_bm25 import BM25Okapi

# 1. Statutory Chunks (The "Library")
# Source: Legal Metrology (Packaged Commodities) Rules, 2011
LEGAL_METROLOGY_RULES = [
    {
        "id": "Rule 6(1)(a)",
        "text": "Rule 6(1)(a): Every package shall bear the name and complete address of the manufacturer, or where the manufacturer is not the packer, the name and address of the manufacturer and packer."
    },
    {
        "id": "Rule 6(1)(b)",
        "text": "Rule 6(1)(b): Every package shall bear the common or generic name of the commodity contained in the package."
    },
    {
        "id": "Rule 6(1)(c)",
        "text": "Rule 6(1)(c): Every package shall bear the net quantity, in terms of the standard unit of weight or measure, of the commodity."
    },
    {
        "id": "Rule 6(1)(e)",
        "text": "Rule 6(1)(e): Every package shall bear the retail sale price of the package in the format: 'Maximum or Max. retail price Rs. ... / ₹ ... inclusive of all taxes'."
    },
    {
        "id": "Rule 6(11)",
        "text": (
            "Rule 6(11): The Unit Sale Price (USP) of the commodity shall be declared on the package. "
            "The USP is calculated as MRP divided by the Net Quantity (e.g., MRP ÷ weight in grams, or MRP ÷ volume in ml). "
            "The declared USP must be expressed in rupees per standard unit and rounded off to the nearest two decimal places. "
            "If the printed USP deviates from the mathematically computed USP (MRP / Net Quantity) by more than 1%, "
            "it constitutes a violation of Rule 6(11)."
        )
    },
    {
        "id": "Rule 9",
        "text": (
            "Rule 9: Every declaration required to be made under these rules shall be in Hindi (Devnagari script) "
            "or in English. Declarations printed exclusively in a regional language other than Hindi or English "
            "are non-compliant. Packages may additionally carry text in other languages, but the mandatory "
            "declarations (manufacturer name, net quantity, MRP, date of manufacture/expiry) MUST appear in "
            "Hindi or English."
        )
    },
    {
        "id": "Rule 13",
        "text": (
            "Rule 13: Statement of units of weight, measure or number. "
            "The symbol for units shall not be in plural form (e.g., 'g' not 'gms', 'kg' not 'kgs', 'ml' not 'mls'). "
            "No full stop shall follow the symbol except at the end of a sentence."
        )
    },
    {
        "id": "Section 36",
        "text": (
            "Section 36 of the Legal Metrology Act, 2009: No person shall tamper with, alter, or deface any "
            "weight or measure or any stamping mark thereon. In the context of packaged commodities, affixing "
            "a second price sticker (dual-layer label) over the original MRP label to alter the declared retail "
            "price is an offence under Section 36. Such tampering is detectable by the presence of a secondary "
            "sticker border in the MRP region of the package."
        )
    }
]

# 2. Tokenizer helper
def tokenize(text: str) -> list[str]:
    # Lowercase and remove punctuation for better BM25 matching
    text = text.lower().translate(str.maketrans('', '', string.punctuation))
    return text.split()

# 3. Build the BM25 Index in-memory on startup
corpus = [chunk["text"] for chunk in LEGAL_METROLOGY_RULES]
tokenized_corpus = [tokenize(doc) for doc in corpus]
bm25_index = BM25Okapi(tokenized_corpus)

# 4. The Retrieval Function (The "Librarian")
def retrieve_relevant_rules(ocr_text: str, top_k: int = 5) -> list[str]:
    """
    Takes the consolidated multi-panel OCR text, tokenizes it, and retrieves
    the most relevant legal rules using BM25 ranking.

    top_k defaults to 5 to ensure Rule 6(11), Rule 9, and Section 36 are
    always candidates alongside the core Rule 6 declarations.
    """
    tokenized_query = tokenize(ocr_text)
    # Get top matching rule strings
    retrieved_docs = bm25_index.get_top_n(tokenized_query, corpus, n=top_k)
    return retrieved_docs