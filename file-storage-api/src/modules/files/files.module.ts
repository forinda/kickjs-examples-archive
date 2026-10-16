import { defineModule } from '@forinda/kickjs'
import { FilesController } from './files.controller'

export const FilesModule = defineModule({
  name: 'FilesModule',
  build: () => ({
    routes: () => ({ path: '/files', controller: FilesController }),
  }),
})
