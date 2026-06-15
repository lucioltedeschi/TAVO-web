export default function Legales() {
  return (
    <div className="container narrow legales">
      <h1>Información legal</h1>

      <h2>Sobre las compras en este sitio</h2>
      <p>
        Las compras realizadas en este sitio son procesadas a través de <b>Mercado Pago</b>,
        plataforma que cumple con los estándares de seguridad PCI-DSS. TAVO no almacena
        datos de tarjetas ni credenciales de pago.
      </p>
      <p>
        Al completar una compra, el cliente recibe un <b>comprobante de pago</b> con el detalle
        de la operación y un código de seguimiento para consultar el estado de su pedido.
      </p>

      <h2>Facturación</h2>
      <p>
        Conforme a la normativa vigente de ARCA (ex AFIP), las ventas realizadas por medios
        electrónicos deben respaldarse con <b>factura electrónica</b>. La factura correspondiente
        a cada operación se emite a través de los servicios de ARCA y puede solicitarse
        respondiendo al email de confirmación de compra o por nuestros canales de contacto,
        indicando CUIT/CUIL o DNI y condición frente al IVA.
      </p>

      <h2>Defensa del consumidor</h2>
      <p>
        Para consultas o reclamos, contactanos por nuestros canales de atención.
        Ley 24.240 de Defensa del Consumidor. Dirección Nacional de Defensa del Consumidor
        y Arbitraje del Consumo: <a href="https://www.argentina.gob.ar/defensadelconsumidor" target="_blank" rel="noreferrer">argentina.gob.ar/defensadelconsumidor</a>.
        {' '}Botón de arrepentimiento: las compras pueden revocarse dentro de los 10 días corridos
        de recibido el producto (art. 34, Ley 24.240), considerando que por tratarse de
        alimentos perecederos aplican las excepciones correspondientes.
      </p>

      <h2>Datos personales</h2>
      <p>
        Los datos personales recolectados (nombre, email, teléfono y dirección) se utilizan
        exclusivamente para procesar y entregar pedidos, conforme a la Ley 25.326 de
        Protección de Datos Personales. No se comparten con terceros, salvo lo necesario
        para procesar el pago (Mercado Pago).
      </p>
    </div>
  );
}
