from typing import List

def generate_queries(industry: str, city: str, country: str) -> List[str]:
    """Generates a list of search query variations for company discovery."""
    
    # Clean inputs
    ind = industry.strip()
    cit = city.strip()
    coun = country.strip()
    
    base_location = f"{cit} {coun}".strip()
    
    queries = [
        f'"{ind}" company {base_location}',
        f'"{ind}" firm {base_location} contact',
        f'top "{ind}" companies in {cit}',
        f'"{ind}" {base_location} email phone',
        f'list of "{ind}" businesses {cit}',
        f'"{ind}" manufacturers or suppliers {base_location}',
        f'"{ind}" corporate office {cit}',
        f'"{ind}" B2B {base_location}',
        f'"{ind}" ERP {base_location}',
        f'leading {ind} companies {coun}'
    ]
    
    return queries
