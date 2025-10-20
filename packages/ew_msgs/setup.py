from setuptools import setup, find_packages

package_name = "ew_msgs"

setup(
    name=package_name,
    version="0.0.1",
    packages=find_packages(include=[package_name]),
    data_files=[
        ("share/ament_index/resource_index/packages", ["resource/" + package_name]),
        ("share/" + package_name, ["package.xml"]),
        ("share/" + package_name + "/msg", []),
    ],
    install_requires=["setuptools"],
    zip_safe=True,
    maintainer="Swarm EW Team",
    maintainer_email="maintainers@swarm-ew.local",
    description="Shared message definitions for the swarm early warning research platform.",
    license="Apache-2.0",
    tests_require=["pytest"],
    entry_points={},
)
