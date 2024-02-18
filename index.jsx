import React from 'https://esm.sh/react@18.2.0'
import ReactDOM from 'https://esm.sh/react-dom@18.2.0'
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client'
const { useEffect, useState } = React

const spamMd5s = [
  'a6a9ed825b1b605a0b34e44531d9410e',
  '7bb73e31108576c6e94dfe0cd7f1b502',
  'cd544c6b5d0b298e11d5ad77007da9d6',
  '702050f370f0e262368a955a1b26ee1d',
]

const spamBlurhashes = [
  'elJ+3xk9Oat6NgtKjcV[aeo0}7agoJofj?xabYkTj@j=p_jcs,WBow',
  'eRQ0Hyrq.8IV%MVD4T%gxuIUrqD%ozxuRj~q?bM{M{%M~qxuM{t6bH',
]

const spamKeywords = ['#診断メーカー', '黒猫サーバー', '한국괴물군']

const dangerousAtCount = 5
const dangerousBlurHashSimilarity = 0.8

function pickNotifications(domain, token, limit = 30) {
  return fetch(`https://${domain}/api/i/notifications`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      limit,
      markAsRead: false,
    }),
    method: 'POST',
  }).then((x) => x.json())
}

function deleteNote(domain, token, noteId) {
  return fetch(`https://${domain}/api/notes/delete`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      noteId,
    }),
    method: 'POST',
  })
}

function stringMatch(s1, s2) {
  const s1x = s1.split('')
  const s2x = s2.split('')
  return s1x.filter((x, ord) => x === s2x[ord]).length / s1x.length
}

const Page = () => {
  const [domain, setDomain] = useState(localStorage?.getItem('domain') ?? '')
  const [token, setToken] = useState(localStorage?.getItem('token') ?? '')
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (domain === '') return
    localStorage?.setItem('domain', domain)
  }, [domain])
  useEffect(() => {
    if (token === '') return
    localStorage?.setItem('token', token)
  }, [token])

  const getNotifications = async () => {
    const notifications = await pickNotifications(domain, token)
    console.log('Notifications:', notifications)
    setNotifications(notifications)
  }

  const doAction = async () => {
    const noteIds = [
      ...document.querySelectorAll('input.removeNote[type="checkbox"]'),
    ].map((x) => x.name)
    for (const i of noteIds) {
      await deleteNote(domain, token, i)
      console.log(`Removed ${i}`)
    }
    alert(`Deleted ${noteIds.length} items.`)
  }

  return (
    <React.Fragment>
      <div>
        <label>
          Domain:{' '}
          <input
            type="text"
            value={domain}
            onChange={(x) => setDomain(x.target.value)}
          />
        </label>
        <label>
          Token:{' '}
          <input
            type="text"
            value={token}
            onChange={(x) => setToken(x.target.value)}
          />
        </label>
        <button onClick={getNotifications}>Pick</button>
      </div>
      <div>
        <h2>
          Recent notifications
          <button onClick={doAction}>Act!</button>
        </h2>
        <table>
          <tr>
            <th>ID</th>
            <th>From</th>
            <th>Text</th>
            <th>Image</th>
            <th>Verdict</th>
            <th>Kill?</th>
          </tr>
          {notifications.map((item, key) => {
            const { id, user, note } = item
            const userHandle = `@${user.username}@${user.host}`

            // rules
            const hasSpamMd5 =
              note.files.filter((x) => spamMd5s.includes(x.md5)).length > 0

            const blurHash = note.files?.[0]?.blurhash ?? ''
            const maxBlurHashRate = spamBlurhashes
              .map((x) => stringMatch(x, blurHash))
              .reduce((a, b) => (a > b ? a : b))

            const verdictItems = [
              [`MD5: ${hasSpamMd5}`, hasSpamMd5],
              [
                `BlurHash: ${(maxBlurHashRate * 100).toFixed(1)}%`,
                maxBlurHashRate > dangerousBlurHashSimilarity,
              ],
              [
                `Mentions: ${note.mentions.length}`,
                note.mentions.length >= dangerousAtCount,
              ],
              [
                'Keyword hit',
                spamKeywords.filter((x) => note.text.includes(x)).length > 0,
              ],
            ]
            const autoCheck =
              verdictItems.filter((x) => x[1] === true).length > 0

            return (
              <tr key={key}>
                <td>{id}</td>
                <td>{userHandle}</td>
                <td>{note.text}</td>
                <td>
                  {note.files.length > 0 ? (
                    <img
                      src={note.files?.[0]?.url}
                      style={{
                        maxWidth: '15vw',
                      }}
                    />
                  ) : (
                    <span>None</span>
                  )}
                </td>
                <td>
                  <ul>
                    {verdictItems.map((x, _key) => (
                      <li key={_key}>{(x[1] ? '🔴' : '🟢') + ' ' + x[0]}</li>
                    ))}
                  </ul>
                </td>
                <td>
                  <input
                    className="removeNote"
                    name={id}
                    type="checkbox"
                    checked={autoCheck}
                  />
                </td>
              </tr>
            )
          })}
        </table>
      </div>
    </React.Fragment>
  )
}

createRoot(document.querySelector('#app')).render(<Page />)
