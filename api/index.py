from api.app import app
from mangum import Mangum

handler = Mangum(app, lifespan="off")
