from pathlib import Path

from transpire.resources import Deployment, Ingress, Service
from transpire.types import Image
from transpire.utils import get_image_tag

name = "labmap"


def objects():
    dep = Deployment(
        name="labmap",
        image=get_image_tag("labmap"),
        ports=[3000],
    )

    svc = Service(
        name="labmap",
        selector=dep.get_selector(),
        port_on_pod=3000,
        port_on_svc=80,
    )

    ing = Ingress.from_svc(
        svc=svc,
        host="labmap.ocf.berkeley.edu",
        path_prefix="/",
    )

    yield dep.build()
    yield svc.build()
    yield ing.build()


def images():
    yield Image(name="labmap", path=Path("/"), registry="ghcr")
