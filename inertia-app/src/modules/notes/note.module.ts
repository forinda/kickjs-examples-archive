import { defineModule } from '@forinda/kickjs'
import { APP_DB } from '../../db/db.adapter'
import { NoteController } from './note.controller'
import { createNoteRepository, NOTE_REPOSITORY } from './note.repository'

export const NoteModule = defineModule({
  name: 'NoteModule',
  build: () => ({
    register(container) {
      container.registerFactory(NOTE_REPOSITORY, () =>
        createNoteRepository(container.resolve(APP_DB)),
      )
    },
    // Pages live at the site root, outside the /api/v1 prefix.
    routes: () => ({ path: '/', prefix: false, version: false, controller: NoteController }),
  }),
})
