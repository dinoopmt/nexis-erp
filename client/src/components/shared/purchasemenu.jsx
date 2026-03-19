import React from "react";
import { Truck, RotateCcw, Users } from "lucide-react";

const Inventory = ({ active, setActive }) => {
  const menus = [
    { name: "Vendor", icon: Users },
    { name: "GRN", icon: Truck },
    { name: "GRV", icon: RotateCcw },
    
  ];

  return (
    <div className="w-full border-b bg-white">
      <div className="flex gap-6 px-6">
        {menus.map((menu) => {
          const Icon = menu.icon;

          return (
            <button
              key={menu.name}
              onClick={() => setActive(menu.name)}
              className={`flex items-center gap-2 py-3 px-2 border-b-2 transition ${
                active === menu.name
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-gray-600 hover:text-black"
              }`}
            >
              <Icon size={18} />
              {menu.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};




