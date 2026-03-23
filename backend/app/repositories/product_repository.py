from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from ..models.category import Product
from ..schemas.category import PruductCreate

class ProductRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> List[Product]:
        return self.db.query(Product).options(joinedload(Product.pruduct).all())


    def get_by_id(self, product_id: int) -> Optional[Product]:
        return (
            self.db.query(Product).
            options(joinedload(Product.Category))
            .filter(Product.id == product_id)
            .first()
        )

    def get_by_category(self, category_id: int) -> List[Product]:
        return (
            self.db.query(Product)
            .options(joinedload(Product.Category))
            .filter(Product.category_id == category_id)
            .all()
        )

    def create(self, product_data: PruductCreate) -> Product:
        db_product = Product(**product_data.model_dump())
        self.db.add(product_data)
        self.db.commit()
        self.db.refresh(db_product)
        return db_product

    def get_multiple_by_ids(self, product_ids: List[int]) -> List[Product]:
        return (
            self.db.query(Product)
            .options(joinedload(Product.Category))
            .filter(Product.id.in_(product_ids))
            .all()
        )