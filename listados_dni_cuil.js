const fs = require('fs')
const axios = require('axios')
const { stringify } = require('csv-stringify')
const dotenv = require('dotenv')

dotenv.config()

async function postRN(loop = 1, start, end) {
  const filename =
    loop < 10
      ? `./assets/dni/Listados_Dni_Cuit_v0${loop}.csv`
      : `./assets/dni/Listados_Dni_Cuit_v${loop}.csv`
  const writableStream = fs.createWriteStream(filename)

  axios.defaults.headers.common['Authorization'] = process.env.ORACLE_PASSWORD
  axios.defaults.headers.post['Content-Type'] = 'application/json'

  const columns = ['ID_de_contacto', 'Dni', 'ID_en_AIS', 'ID_de_incidente']

  const stringifier = stringify({
    header: true,
    columns: columns,
    delimiter: '|',
  })

  let totalRegistros = 0
  await axios
    .post('https://qbe.custhelp.com/services/rest/connect/v1.3/analyticsReportResults', {
      id: 101762,
      filters: [
        {
          name: 'id1',
          values: JSON.stringify(end),
        },
        {
          name: 'id2',
          values: JSON.stringify(start),
        },
      ],
    })
    .then(function (response) {
      response.data.rows.forEach((row) => {
        const newRow = row.map((data) => data?.replace(/\r\n|\n|\r/g, ' '))
        stringifier.write(newRow)
      })
      if (response.data.count <= 10000) {
        totalRegistros = response.data.count
        console.log(response.data.count, '<<--count--')
      } else {
        console.log(response.data.count, '<<--count--')
        console.log('loop ->', loop, 'start->', start, 'end->', end)
        throw new Error('Posible pérdida de datos al realizar el pedido post')
      }
    })
    .catch(function (error) {
      console.log('loop ->', loop, 'start->', start, 'end->', end)
      console.log(error)
      return error
    })

  stringifier.pipe(writableStream)
  console.log(`Los datos fueron guardados en archivo: ${filename} `)

  return totalRegistros
}

async function Listados_Dni_Cuit() {
  const primerContacto = 131930 // 131930
  const ultimmoContacto = 12331766 // 12331766
  const cantidadPorArchivo = 2000
  let totalRegistros = 0
  let totalDeArchivos = 0
  let loop = 1
  const directorio = `./assets/dni`

  // Asegurarse de que el directorio exista, si no, créalo
  if (!fs.existsSync(directorio)) {
    fs.mkdirSync(directorio, { recursive: true })
  }

  for (index = primerContacto; index < ultimmoContacto; index += cantidadPorArchivo) {
    const start = index
    const end =
      index + cantidadPorArchivo > ultimmoContacto ? ultimmoContacto : index + cantidadPorArchivo

    const cantidadRegistros = await postRN(loop, start, end)
    totalRegistros += cantidadRegistros
    totalDeArchivos++
    loop++
  }

  console.log(`Se han guardado ${totalDeArchivos} archivos.`)
  console.log(`Se han guardado un total de ${totalRegistros} registros.`)
}

Listados_Dni_Cuit()
