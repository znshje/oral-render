import File from "@/pages/files/page";
import {Button} from "@radix-ui/themes";
import {useNavigate} from "react-router-dom";

export default function Page() {
    const router = useNavigate();

    return <div style={{
        height: '100vh',
        display: 'flex',
        gap: 8,
        alignItems: 'center'
    }}>
        <div style={{
            flex: 1,
            height: '100%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            <h1>单张渲染</h1>
            <File />
        </div>

        <div style={{
            height: '80vh',
            width: 1,
            background: '#ccc'
        }} />

        <div style={{
            flex: 1,
            height: '100%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            <h1>多张渲染</h1>
            <div style={{
                flex: 1
            }}>
                <Button onClick={() => {
                    router('/multi-render')
                }}>GO</Button>
            </div>
        </div>
    </div>
}