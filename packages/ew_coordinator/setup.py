from setuptools import setup, find_packages

package_name = "ew_coordinator"

setup(
    name=package_name,
    version="0.0.1",
    packages=find_packages(include=[package_name]),
    data_files=[
        ("share/ament_index/resource_index/packages", ["resource/" + package_name]),
        ("share/" + package_name, ["package.xml"]),
        ("share/" + package_name + "/launch", []),
    ],
    install_requires=["setuptools"],
    zip_safe=True,
    maintainer="Swarm EW Team",
    maintainer_email="maintainers@swarm-ew.local",
    description="Coordination utilities for SITL-only swarm early warning experiments.",
    license="Apache-2.0",
    tests_require=["pytest"],
    entry_points={},
)
