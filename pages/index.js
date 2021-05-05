import Head from 'next/head'
import AccountTable from '../components/AccountTable'
import { useState, useEffect } from 'react'
import Cookies from 'universal-cookie';
import axios from 'axios'
const { DateTime } = require("luxon");

export default function Home() {

  const cookies = new Cookies();

  const defaultAcc = cookies.get("accounts") ? cookies.get("accounts") : []
  const defaultBal = cookies.get("balance") ? cookies.get("balance") : {}
  const defaultCpu = cookies.get("cpu") ? cookies.get("cpu") : {}
  const defaultUpdate = cookies.get("lastUpdate") ? cookies.get("lastUpdate") : DateTime.now().setZone("local").setLocale("en-US").toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS)
  const [account, setAccount] = useState(defaultAcc)
  const [input, setInput] = useState("")
  const [cpu, setCpu] = useState(defaultCpu)
  const [balance, setBalance] = useState(defaultBal)
  const [update, setUpdate] = useState(defaultUpdate)

  const fetchCpuData = async (user) => {
      await axios.post('https://chain.wax.io/v1/chain/get_account',
      {
          "account_name": user,
      }
      ).then(({data}) => {
          //console.log(data.cpu_limit)
          //console.log(data)
          const newCpu = {...cpu, [user]: data.cpu_limit}
          //console.log(newCpu)
          //console.log("will set")
          setCpu(newCpu)
          cookies.set("cpu", newCpu)
      }).catch((err) => {
          //console.log("Cannot get CPU of! "+user)
          const newCpu = {...cpu, [user]: {
              "used": 0,
              "available": 0,
              "max": 0
          }}
          setCpu(newCpu)
          cookies.set("cpu", newCpu)
      })
  }

  const getBalance = async (user) => {
      await axios.post('https://chain.wax.io/v1/chain/get_currency_balance',
      {
          "code": "alien.worlds",
          "account": user,
          "symbol": "TLM"
      }
      ).then(({data}) => {
        const newBalance = {...balance, [user]: data[0].slice(0,-4)+" TLM" }
        //console.log(newBalance)
        //console.log("will set bal")
        setBalance(newBalance)
        cookies.set("balance", newBalance)
      }).catch((err) => {
        const newBalance = {...balance, [user]: "ERROR TLM" }
        //console.log(newBalance)
        setBalance(newBalance)
        cookies.set("balance", newBalance)
      })
  }

  const handleAddAcc = (e) => {
    e.preventDefault()
    const newCpu = {...cpu, [input]: {
      "used": 0,
      "available": 0,
      "max": 0
    }}
    //console.log(newCpu)
    setCpu(newCpu)
    const newBalance = {...balance, [input]: "Loading..."}
    //console.log(newBalance)
    setBalance(newBalance)
    let newAcc = [...account]
    newAcc.push(input)
    fetchCpuData(input)
    getBalance(input)
    setAccount(newAcc)
    setInput("")
    cookies.set("accounts", newAcc)
  }

  const handleDelete = (acc) => {
    let newAcc = [...account].filter((arr) => arr != acc)
    const newCpu = {...cpu}
    const newBalance = {...balance, [acc]: "Loading..."}
    delete newCpu[acc]
    delete newBalance[acc]
    //console.log(newAcc)
    setAccount(newAcc)
    setCpu(newCpu)
    setBalance(newBalance)
    //console.log(newCpu)
    //console.log(newBalance)
    cookies.set("accounts", newAcc)
    cookies.set("balance", newBalance)
    cookies.set("cpu", newCpu)
  }

  useEffect(() => {
      const interval = setInterval(async () => {
        console.log("Refreshing...")
        const all = [...account]
        for(let acc of all) {
          console.log("Updating... "+acc)
          await getBalance(acc)
          await fetchCpuData(acc)
        }
        cookies.set("balance", balance)
        cookies.set("cpu", cpu)
        const updateTime = DateTime.now().setZone("local").setLocale("en-US").toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS)
        console.log("Done! "+updateTime)
        setUpdate(updateTime)
        cookies.set("lastUpdate", updateTime)
      }, 10000);
      return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col min-h-screen items-center justify-center mt-10 px-2 lg:px-0">
      <Head>
        <title>Alienworlds Wax Account Monitor</title>
        <meta name="description" content="Alienworlds Wax Account Monitor" />
      </Head>

      <main className="flex flex-col">
        <span className="text-5xl font-bold mb-3 text-center">AW Wax Account Monitor</span>

        <div className="flex flex-col rounded-md shadow-lg items-center justify-center p-6 my-3 bg-gray-700">
          <form onSubmit={(e) => { handleAddAcc(e) }}>
            <div className="flex flex-row items-center justify-center">
              <label className="mr-4">WAM Account:</label>
              <input type="text" className="shadow appearance-none rounded py-2 px-3 bg-gray-300 text-gray-800 font-bold leading-tight focus:outline-none focus:shadow-outline"
              onChange={(e) => { setInput(e.target.value) }} value={input} />
            </div>
            <div className="mt-5 w-full">
              <button className="bg-gray-500 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
              type="submit">
                ADD
              </button>
            </div>
          </form>
        </div>
      </main>

      <div className="flex flex-col rounded-md items-center justify-center p-6 my-3 w-full lg:w-5/6 bg-gray-700">
        <span className="text-lg font-bold text-center my-1">Data will automatically refresh every 30 secs</span>
        <span className="text-lg font-bold text-center my-1">Click at trash icon / wallet name to delete</span>
        <span className="text-center my-1">Last Update: {update}</span>
        <AccountTable accounts={account} cpu={cpu} balance={balance} onDelete={handleDelete} />
      </div>
    </div>
  )
}