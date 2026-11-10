import { useState } from 'react'
import EntryScreen from './components/EntryScreen.jsx'
import LibraryRoom from './components/LibraryRoom.jsx'
import { loadProfile, saveProfile, clearProfile } from './lib/storage.js'
import { CHARACTER_MAP } from './game/characters.js'

export default function App() {
  const [profile, setProfile] = useState(() => {
    const p = loadProfile()
    return p && CHARACTER_MAP[p.charId] ? p : null
  })

  if (!profile) {
    return (
      <EntryScreen
        onEnter={(p) => {
          saveProfile(p)
          setProfile(p)
        }}
      />
    )
  }
  return (
    <LibraryRoom
      key={`${profile.name}-${profile.charId}`}
      profile={profile}
      onLeave={() => {
        clearProfile()
        setProfile(null)
      }}
    />
  )
}
