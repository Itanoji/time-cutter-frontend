import {useContext} from "react";
import {DiagramContext} from "../../DiagramProperties/DiagramContext";

const ManageSignals = () => {
    const {diagram,addSignal} = useContext(DiagramContext);

    const createSignal = () => {
        addSignal({
            name: 'Сигнал ' + (diagram.signals.length + 1),
            type: 'signal',
            areas : []
        })
    }

    return <div className="bg-gray-300 border-b border-gray-800 p-2 flex flex-col" style={{height: '5%'}}>
        <button onClick={createSignal} className={"text-center cursor-pointer hover:underline decoration-dotted underline-offset-2"}>Добавить</button>
    </div>
}

export default ManageSignals