from stix_taxii.taxii import TaxiiCollection, create_bundle, create_indicator, map_iocs_to_attack


def test_taxii_roundtrip():
    indicator = create_indicator(ioc="deadbeef", technique_id="T1486", description="Ransomware hash")
    bundle = create_bundle([indicator])
    collection = TaxiiCollection(title="municipal-feed")
    collection.push(bundle)
    pulled = collection.pull()
    mapping = map_iocs_to_attack(pulled["objects"])
    assert "T1486" in mapping
