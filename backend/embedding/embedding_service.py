# embedding_service.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer
from pydantic import BaseModel
from typing import List, Dict, Any
import numpy as np
import json
import os

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the SentenceTransformer model
model = SentenceTransformer('all-MiniLM-L6-v2')

# Create cache for embeddings
drug_embeddings = {}

class TextItem(BaseModel):
    text: str

class TextEmbeddingRequest(BaseModel):
    texts: List[str]

class DrugMatchRequest(BaseModel):
    extracted_text: str
    threshold: float = 0.8

# Load drug data
def load_drug_data():
    try:
        # Go up one directory to backend, then to data
        script_dir = os.path.dirname(os.path.abspath(__file__))
        parent_dir = os.path.dirname(script_dir)
        data_path = os.path.join(parent_dir, "data/drugs.json")
        print(f"Loading drugs from: {data_path}")
        
        with open(data_path, 'r') as file:
            return json.load(file)
    except Exception as e:
        print(f"Error loading drug data: {e}")
        return []

# Precompute embeddings for all drugs and ingredients
def precompute_drug_embeddings():
    global drug_embeddings
    drugs = load_drug_data()
    
    all_terms = []
    for drug in drugs:
        # Add drug name
        all_terms.append(drug["name"])
        # Add each ingredient
        for ingredient in drug["ingredients"]:
            all_terms.append(ingredient)
    
    # Get unique terms
    unique_terms = list(set(all_terms))
    print(f"Computing embeddings for {len(unique_terms)} unique drug terms...")
    
    # Compute embeddings in batches
    batch_size = 32
    for i in range(0, len(unique_terms), batch_size):
        batch = unique_terms[i:i+batch_size]
        embeddings = model.encode(batch)
        
        for j, term in enumerate(batch):
            drug_embeddings[term.upper()] = embeddings[j]
    
    print(f"Finished computing embeddings for {len(drug_embeddings)} terms")

# Precompute embeddings on startup
@app.on_event("startup")
def startup_event():
    precompute_drug_embeddings()

@app.post("/encode")
def encode_text(item: TextItem):
    try:
        embedding = model.encode(item.text)
        return {"embedding": embedding.tolist()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error encoding text: {str(e)}")

@app.post("/match_drugs")
def match_drugs(request: DrugMatchRequest):
    try:
        drugs = load_drug_data()
        extracted_text = request.extracted_text
        threshold = request.threshold
        
        # Split the extracted text into words and phrases
        words = extracted_text.split()
        phrases = [extracted_text]  # Include entire text
        
        # Add potential phrases (2-3 consecutive words)
        for i in range(len(words) - 1):
            phrases.append(f"{words[i]} {words[i+1]}")
        for i in range(len(words) - 2):
            phrases.append(f"{words[i]} {words[i+1]} {words[i+2]}")
        
        # Get embeddings for all phrases
        phrase_embeddings = model.encode(phrases)
        
        matches = []
        matched_drug_names = set()
        
        # Compare with all drug names and ingredients
        for i, phrase in enumerate(phrases):
            phrase_embedding = phrase_embeddings[i]
            best_match = None
            best_score = 0
            best_drug = None
            
            for drug in drugs:
                # Match against drug name
                drug_name = drug["name"]
                if drug_name.upper() in drug_embeddings:
                    drug_embedding = drug_embeddings[drug_name.upper()]
                    similarity = np.dot(phrase_embedding, drug_embedding) / (
                        np.linalg.norm(phrase_embedding) * np.linalg.norm(drug_embedding)
                    )
                    
                    if similarity >= threshold and similarity > best_score:
                        best_score = similarity
                        best_match = drug_name
                        best_drug = drug
                
                # Match against ingredients
                for ingredient in drug["ingredients"]:
                    if ingredient.upper() in drug_embeddings:
                        ingredient_embedding = drug_embeddings[ingredient.upper()]
                        similarity = np.dot(phrase_embedding, ingredient_embedding) / (
                            np.linalg.norm(phrase_embedding) * np.linalg.norm(ingredient_embedding)
                        )
                        
                        if similarity >= threshold and similarity > best_score:
                            best_score = similarity
                            best_match = ingredient
                            best_drug = drug
            
            if best_drug and best_drug["name"] not in matched_drug_names:
                matched_drug_names.add(best_drug["name"])
                matches.append({
                    "drug": best_drug,
                    "matched_term": best_match,
                    "score": float(best_score),
                    "matched_phrase": phrase
                })
        
        # Sort by highest score
        matches.sort(key=lambda x: x["score"], reverse=True)
        
        return {
            "matched_drugs": [match["drug"] for match in matches],
            "details": matches
        }
    except Exception as e:
        print(f"Error matching drugs: {e}")
        raise HTTPException(status_code=500, detail=f"Error matching drugs: {str(e)}")

# Simple endpoint for testing
@app.get("/")
def read_root():
    return {"message": "Embedding service is running!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)