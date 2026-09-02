import { createBrowserRouter } from 'react-router-dom'
import { WelcomeScreen } from '@/modules/welcome/components/WelcomeScreen/WelcomeScreen'
import { HomeScreen } from '@/modules/home/components/HomeScreen/HomeScreen'
import { NewChatScreen } from '@/modules/new-chat/components/NewChatScreen/NewChatScreen'
import { ChatScreen } from '@/modules/chat/components/ChatScreen/ChatScreen'
import { MediaPreviewScreen } from '@/modules/media-preview/components/MediaPreviewScreen/MediaPreviewScreen'
import { SessionEndScreen } from '@/modules/session-end/components/SessionEndScreen/SessionEndScreen'
import { AppShell } from '@/shared/AppShell/AppShell'
import { RequireSession } from './RequireSession'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <WelcomeScreen /> },
      {
        path: '/home',
        element: (
          <RequireSession>
            <HomeScreen />
          </RequireSession>
        ),
      },
      {
        path: '/new-chat',
        element: (
          <RequireSession>
            <NewChatScreen />
          </RequireSession>
        ),
      },
      {
        path: '/chat/:chatId',
        element: (
          <RequireSession>
            <ChatScreen />
          </RequireSession>
        ),
      },
      {
        path: '/chat/:chatId/media-preview',
        element: (
          <RequireSession>
            <MediaPreviewScreen />
          </RequireSession>
        ),
      },
      { path: '/session-end', element: <SessionEndScreen /> },
    ],
  },
])
