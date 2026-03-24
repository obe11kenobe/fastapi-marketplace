from sqlalchemy.orm import Session
from typing import List
from ..repositories.product_repository import ProductRepository
from ..repositories.category_repository import CategoryRepository
from ..schemas.product import ProductResponse, ProductListResponse, ProductCreate
from fastapi import HTTPException, status

class ProductService:
    def __init__(self, db: Session):
        self.product_repository = ProductRepository(db)
        self.category_repository = CategoryRepository(db)

    def get_all_products(self) -> List[ProductResponse]:
        products = self.product_repository.all()
        product_response = [ProductResponse.model_validate(prod) for prod in products]
        return ProductListResponse(products=product_response, total=len(products))


    def get_product_by_id(self, category_id: int) -> ProductResponse:
        category = self.category_repository.get_by_id(category_id)
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Category with id {category_id} not found")

        products = self.product_repository.get_by_id(category_id)
        product_response = [ProductResponse.model_validate(prod) for prod in products]
        return ProductListResponse(products=product_response, total=len(product_response))


    def create_product(self, product_data: ProductCreate) -> ProductResponse:
        category  = self.category_repository.get_by_id(product_data.category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category with id {product_data.category_id} not found"
            )
        product = self.product_repository.create(product_data)
        return ProductResponse.model_validate(product)
