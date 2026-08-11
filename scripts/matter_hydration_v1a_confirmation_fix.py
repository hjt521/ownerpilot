from pathlib import Path

helper = Path('lib/flow/matterHydration.ts')
s = helper.read_text()

old = """    profile.landlordIdentity,\n    profile.landlordIdentityConfirmed,\n    profile.mailingAddress,"""
new = """    profile.landlordIdentity,\n    profile.mailingAddress,"""
if s.count(old) != 1:
    raise SystemExit('profile provenance confirmation anchor changed')
s = s.replace(old, new, 1)

old = """  if (profile) {\n    return {\n      source: 'profile',\n      data: applyProfile(freshData, profile),\n      pageIndex: 0,\n      profileSections: profilePrefillSections(profile),\n    };\n  }"""
new = """  if (profile) {\n    const profiled = applyProfile(freshData, profile);\n    return {\n      source: 'profile',\n      // The legacy profile envelope may contain the prior notice's landlord\n      // identity confirmation bit. Reuse the identity as a convenience default,\n      // never the confirmation: the new notice keeps its fresh confirmation state.\n      data: {\n        ...profiled,\n        landlordIdentityConfirmed: freshData.landlordIdentityConfirmed,\n      },\n      pageIndex: 0,\n      profileSections: profilePrefillSections(profile),\n    };\n  }"""
if s.count(old) != 1:
    raise SystemExit('profile start branch anchor changed')
s = s.replace(old, new, 1)
helper.write_text('\n'.join(line.rstrip() for line in s.splitlines()) + '\n')

test = Path('lib/flow/matterHydration.test.ts')
t = test.read_text()
old = """assert.equal(profiled.data.signerName, 'Saved Signer');\nassert.equal(profiled.data.paymentBranch, 'in_person_and_mail');"""
new = """assert.equal(profiled.data.signerName, 'Saved Signer');\nassert.deepEqual(profiled.data.landlordIdentity, profile.landlordIdentity);\nassert.equal(\n  profiled.data.landlordIdentityConfirmed,\n  fresh.landlordIdentityConfirmed,\n  'saved identity may prefill, but a prior-notice confirmation must not carry into a new notice',\n);\nassert.equal(profiled.data.paymentBranch, 'in_person_and_mail');"""
if t.count(old) != 1:
    raise SystemExit('profile test anchor changed')
t = t.replace(old, new, 1)
test.write_text('\n'.join(line.rstrip() for line in t.splitlines()) + '\n')
